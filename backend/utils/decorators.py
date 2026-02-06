from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from functools import wraps
from flask import jsonify
from models import User

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            print(f"🔐 Verifying JWT for endpoint: {f.__name__}")
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            print(f"✅ JWT verified. User ID: {user_id}")
            
            current_user = User.query.get(user_id)
            if not current_user:
                print(f"❌ User {user_id} not found in database!")
                return jsonify({'message': 'User not found!', 'error': 'USER_NOT_FOUND'}), 401
            
            print(f"✅ User found: {current_user.username} (type: {current_user.user_type})")
            
        except Exception as e:
            print(f"❌ JWT verification failed: {str(e)}")
            return jsonify({'message': 'Invalid or missing token', 'error': str(e)}), 401
            
        return f(current_user, *args, **kwargs)
        
    return decorated

def role_required(required_roles):
    """
    Decorator to enforce role-based access control.
    required_roles can be a single string (e.g. 'admin') or a list (e.g. ['admin', 'courier'])
    
    Supports both user_type roles (admin, customer, courier) and admin_role types 
    (super_admin, finance_admin, support_admin, content_admin)
    """
    if isinstance(required_roles, str):
        required_roles = [required_roles]
        
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            print(f"🔑 Checking roles for {current_user.username}. Required: {required_roles}")
            
            # Define admin role types that exist in the system
            admin_role_types = ['super_admin', 'finance_admin', 'support_admin', 'content_admin']
            
            # Check if any required role is an admin_role type
            required_admin_roles = [role for role in required_roles if role in admin_role_types]
            required_user_types = [role for role in required_roles if role not in admin_role_types]
            
            print(f"   User type: {current_user.user_type}")
            print(f"   Required user types: {required_user_types}")
            print(f"   Required admin roles: {required_admin_roles}")
            
            # Check user_type match
            user_type_match = current_user.user_type in required_user_types
            
            # Check admin_role match (only for admin users)
            admin_role_match = False
            if required_admin_roles and current_user.user_type == 'admin':
                # If user is admin and has an admin_role, check if it matches
                if hasattr(current_user, 'admin_role') and current_user.admin_role in required_admin_roles:
                    admin_role_match = True
                # super_admin has access to everything
                elif hasattr(current_user, 'admin_role') and current_user.admin_role == 'super_admin':
                    admin_role_match = True
            
            print(f"   User type match: {user_type_match}")
            print(f"   Admin role match: {admin_role_match}")
            
            # Grant access if either condition is met
            if user_type_match or admin_role_match:
                print(f"✅ Access granted!")
                return f(current_user, *args, **kwargs)
            
            print(f"❌ Permission denied!")
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

def api_key_required(f):
    """
    Decorator to verify API key for external API access.
    Expects 'X-API-Key' header with valid API key.
    """
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
