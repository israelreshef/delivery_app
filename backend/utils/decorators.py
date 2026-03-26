from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from functools import wraps
from flask import jsonify
from models import User
import logging
import json

logger = logging.getLogger(__name__)

PERMISSION_MATRIX = {
    'support:view': {
        'user_types': {'admin', 'courier', 'customer'},
        'admin_roles': {'super_admin', 'support_admin'},
    },
    'support:create': {
        'user_types': {'admin', 'courier', 'customer'},
        'admin_roles': {'super_admin', 'support_admin'},
    },
    'support:comment': {
        'user_types': {'admin', 'courier', 'customer'},
        'admin_roles': {'super_admin', 'support_admin'},
    },
    'support:edit': {
        'user_types': {'admin'},
        'admin_roles': {'super_admin', 'support_admin'},
    },
    'tasks:view': {
        'user_types': {'admin', 'courier', 'customer'},
        'admin_roles': {'super_admin', 'support_admin', 'content_admin', 'finance_admin'},
    },
    'tasks:edit': {
        'user_types': {'admin', 'courier'},
        'admin_roles': {'super_admin', 'support_admin'},
    },
    'tasks:manage': {
        'user_types': {'admin'},
        'admin_roles': {'super_admin', 'support_admin'},
    },
}


def _extract_explicit_permissions(user):
    """
    Optional escape hatch for future DB fields.
    Supports either list/set or JSON-encoded string in attributes:
    permissions / role_permissions / permission_overrides.
    """
    permission_values = set()
    for field_name in ('permissions', 'role_permissions', 'permission_overrides'):
        raw = getattr(user, field_name, None)
        if not raw:
            continue

        if isinstance(raw, (list, tuple, set)):
            permission_values.update(str(x) for x in raw)
            continue

        if isinstance(raw, str):
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = None
            if isinstance(parsed, list):
                permission_values.update(str(x) for x in parsed)
            elif raw.strip():
                permission_values.add(raw.strip())

    return permission_values


def _extract_group_permissions(user):
    """
    Resolve permissions from Group/UserGroup/GroupPermission tables.
    Safe fallback: if schema isn't migrated yet, return empty set.
    """
    try:
        from models import db, UserGroup, GroupPermission, Permission

        rows = (
            db.session.query(Permission.permission_key)
            .join(GroupPermission, GroupPermission.permission_id == Permission.id)
            .join(UserGroup, UserGroup.group_id == GroupPermission.group_id)
            .filter(UserGroup.user_id == user.id)
            .all()
        )
        return {str(row[0]) for row in rows if row and row[0]}
    except Exception:
        return set()


def has_permission(user, permission):
    if not user:
        return False

    # Admin users keep top-level access by default (backward compatible).
    if user.user_type == 'admin' and getattr(user, 'admin_role', None) in (None, 'super_admin'):
        return True
    if user.user_type == 'admin' and getattr(user, 'admin_role', None) == 'support_admin' and permission.startswith('support:'):
        return True

    explicit_permissions = _extract_explicit_permissions(user)
    if permission in explicit_permissions:
        return True
    if permission in _extract_group_permissions(user):
        return True

    rule = PERMISSION_MATRIX.get(permission)
    if not rule:
        return False

    allowed_user_types = rule.get('user_types', set())
    allowed_admin_roles = rule.get('admin_roles', set())

    if user.user_type in allowed_user_types:
        return True

    if user.user_type == 'admin':
        admin_role = getattr(user, 'admin_role', None)
        if admin_role in allowed_admin_roles:
            return True

    return False

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import request
        # Skip auth for CORS preflight
        if request.method == 'OPTIONS':
            return f(None, *args, **kwargs)

        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()

            # Fix 7: Check token blacklist
            jti = get_jwt().get("jti")
            if jti:
                from models import TokenBlacklist
                from datetime import datetime
                if TokenBlacklist.query.filter_by(jti=jti).first():
                    return jsonify({'error': 'הטוקן אינו תקף, יש להתחבר מחדש'}), 401

            current_user = User.query.get(user_id)
            if not current_user:
                return jsonify({'message': 'User not found!', 'error': 'USER_NOT_FOUND'}), 401

            logger.debug("JWT verified for user_id=%s type=%s endpoint=%s",
                         user_id, current_user.user_type, f.__name__)

        except Exception as e:
            logger.warning("JWT verification failed for %s: %s", f.__name__, str(e))
            return jsonify({'message': 'Invalid or missing token', 'error': str(e)}), 401

        return f(current_user, *args, **kwargs)

    return decorated


def role_required(required_roles):
    """
    Decorator to enforce role-based access control.
    required_roles can be a single string or a list.
    """
    if isinstance(required_roles, str):
        required_roles = [required_roles]

    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            admin_role_types = ['super_admin', 'finance_admin', 'support_admin', 'content_admin']

            required_admin_roles = [r for r in required_roles if r in admin_role_types]
            required_user_types = [r for r in required_roles if r not in admin_role_types]

            user_type_match = current_user.user_type in required_user_types

            admin_role_match = False
            if required_admin_roles and current_user.user_type == 'admin':
                if hasattr(current_user, 'admin_role') and current_user.admin_role in required_admin_roles:
                    admin_role_match = True
                elif hasattr(current_user, 'admin_role') and current_user.admin_role == 'super_admin':
                    admin_role_match = True

            if user_type_match or admin_role_match:
                return f(current_user, *args, **kwargs)

            logger.warning("Permission denied for user_id=%s (type=%s) on %s — required %s",
                           current_user.id, current_user.user_type, f.__name__, required_roles)
            return jsonify({
                'message': 'Permission denied!',
                'error': 'INSUFFICIENT_PERMISSIONS',
                'required_roles': required_roles,
                'user_type': current_user.user_type
            }), 403

        return decorated
    return decorator


def admin_required(f):
    return role_required('admin')(f)


def permission_required(permission):
    """Decorator to enforce permission checks with backward-compatible defaults."""
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            if not has_permission(current_user, permission):
                logger.warning(
                    "Permission denied for user_id=%s (type=%s role=%s) on %s - required %s",
                    getattr(current_user, 'id', None),
                    getattr(current_user, 'user_type', None),
                    getattr(current_user, 'admin_role', None),
                    f.__name__,
                    permission
                )
                return jsonify({
                    'message': 'Permission denied!',
                    'error': 'INSUFFICIENT_PERMISSIONS',
                    'required_permission': permission,
                }), 403
            return f(current_user, *args, **kwargs)

        return decorated
    return decorator


def api_key_required(f):
    """Verify API key for external API access."""
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import request
        import os

        api_key = request.headers.get('X-API-Key')
        valid_api_key = os.environ.get('EXTERNAL_API_KEY', 'default-api-key-change-in-production')

        if not api_key:
            return jsonify({
                'error': 'API key is required',
                'message': 'Please provide X-API-Key header'
            }), 401

        if api_key != valid_api_key:
            return jsonify({
                'error': 'Invalid API key',
                'message': 'The provided API key is not valid'
            }), 403

        return f(*args, **kwargs)

    return decorated
