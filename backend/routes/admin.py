from flask import Blueprint, request, jsonify
from datetime import datetime
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import (
    db,
    Delivery,
    DeliveryStatus,
    User,
    Group,
    Permission,
    UserGroup,
    GroupPermission,
)
from utils.decorators import token_required, role_required
import logging
from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError

admin_bp = Blueprint('admin', __name__)

DEFAULT_PERMISSION_KEYS = [
    'support:view',
    'support:create',
    'support:comment',
    'support:edit',
    'tasks:view',
    'tasks:edit',
    'tasks:manage',
]


def _ensure_permission(permission_key):
    permission = Permission.query.filter_by(permission_key=permission_key).first()
    if permission:
        return permission

    if ':' in permission_key:
        resource, action = permission_key.split(':', 1)
    else:
        resource, action = 'general', permission_key

    permission = Permission(
        permission_key=permission_key,
        resource=resource,
        action=action,
        description=f'Auto-generated permission for {permission_key}',
    )
    db.session.add(permission)
    db.session.flush()
    return permission


def _group_permission_keys(group):
    return [
        gp.permission.permission_key
        for gp in group.group_permissions.all()
        if gp.permission and gp.permission.permission_key
    ]


def _effective_user_permission_keys(user):
    keys = set()
    explicit = getattr(user, 'permissions', None)
    if isinstance(explicit, (list, tuple, set)):
        keys.update(str(x) for x in explicit)

    for ug in user.user_groups.all():
        for gp in ug.group.group_permissions.all():
            if gp.permission and gp.permission.permission_key:
                keys.add(gp.permission.permission_key)
    return sorted(keys)


@admin_bp.route('/dashboard', methods=['GET'])
@token_required
@role_required('admin')
def get_dashboard(current_user):
    """Dashboard aggregation: today's stats, recent orders, weekly revenue"""
    try:
        from sqlalchemy import func
        from models import Courier, Customer, Invoice
        from datetime import timedelta

        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today_start - timedelta(days=7)

        # Today's orders
        today_orders = Delivery.query.filter(Delivery.created_at >= today_start).count()
        today_delivered = Delivery.query.filter(
            Delivery.created_at >= today_start,
            Delivery.status == 'delivered'
        ).count()

        # Today's revenue
        today_revenue = db.session.query(func.sum(Invoice.total_amount)).join(
            Delivery
        ).filter(
            Delivery.created_at >= today_start,
            Delivery.status == 'delivered'
        ).scalar() or 0

        # Active couriers
        active_couriers = Courier.query.filter_by(is_available=True).count()
        total_couriers = Courier.query.count()

        # Active orders
        active_orders = Delivery.query.filter(
            Delivery.status.in_(['assigned', 'picked_up', 'in_transit'])
        ).count()

        # Recent orders (last 5)
        recent = Delivery.query.order_by(Delivery.created_at.desc()).limit(5).all()
        recent_list = [{
            'id': d.id,
            'order_number': d.order_number,
            'status': d.status,
            'customer': d.customer.full_name if d.customer else 'Unknown',
            'created_at': d.created_at.isoformat()
        } for d in recent]

        # Weekly revenue (by day)
        weekly = []
        for i in range(7):
            day = today_start - timedelta(days=6 - i)
            day_end = day + timedelta(days=1)
            rev = db.session.query(func.sum(Invoice.total_amount)).join(
                Delivery
            ).filter(
                Delivery.created_at >= day,
                Delivery.created_at < day_end,
                Delivery.status == 'delivered'
            ).scalar() or 0
            weekly.append({
                'date': day.strftime('%Y-%m-%d'),
                'revenue': float(rev)
            })

        return jsonify({
            'today': {
                'orders': today_orders,
                'delivered': today_delivered,
                'revenue': float(today_revenue),
            },
            'active_couriers': active_couriers,
            'total_couriers': total_couriers,
            'active_orders': active_orders,
            'recent_orders': recent_list,
            'weekly_revenue': weekly
        }), 200

    except Exception as e:
        logging.error(f"Dashboard error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/delete/<int:order_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_order(current_user, order_id):
    """מחיקת הזמנה - רק למנהלים"""
    try:
        delivery = Delivery.query.get_or_404(order_id)
        
        # מחק (CASCADE ידאג לשאר)
        db.session.delete(delivery)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Order {order_id} deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting order: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/deliveries/active-count', methods=['GET'])
@token_required
@role_required('admin')
def get_active_deliveries_count(current_user):
    """
    החזרת מספר משלוחים פעילים מה-DB.
    פעיל = אחד מהסטטוסים: assigned / picked_up / in_transit.
    """
    try:
        active_statuses = ['assigned', 'picked_up', 'in_transit']
        count = Delivery.query.filter(Delivery.status.in_(active_statuses)).count()
        return jsonify({'active_count': count}), 200
    except Exception as e:
        logging.error(f"Error fetching active deliveries count: {str(e)}", exc_info=True)
        return jsonify({'error': 'שגיאה בקבלת מספר המשלוחים הפעילים'}), 500


@admin_bp.route('/couriers/locations', methods=['GET'])
@token_required
@role_required('admin')
def get_courier_locations(current_user):
    """
    החזרת מיקומי שליחים למפת הדשבורד.
    "חי" = יש חיבור סוקט פעיל עבור אותו שליח.
    """
    try:
        from models import Courier
        from sockets.delivery_events import connected_couriers

        # Map of courier_id that are currently connected via sockets
        live_ids = {cid for cid in connected_couriers.values() if cid is not None}

        couriers = Courier.query.filter(
            Courier.current_location_lat.isnot(None),
            Courier.current_location_lng.isnot(None)
        ).all()

        result = []
        for c in couriers:
            is_live = c.id in live_ids
            # Find any active delivery for status coloring
            active_delivery = Delivery.query.filter(
                Delivery.courier_id == c.id,
                Delivery.status.in_(['assigned', 'picked_up', 'in_transit'])
            ).first()

            result.append({
                'id': c.id,
                'name': getattr(c, 'full_name', f'Courier {c.id}'),
                'latitude': c.current_location_lat,
                'longitude': c.current_location_lng,
                'is_live': is_live,
                'is_available': c.is_available,
                'active_delivery_id': active_delivery.id if active_delivery else None,
                'last_seen': c.updated_at.isoformat() if hasattr(c, 'updated_at') and c.updated_at else datetime.utcnow().isoformat()
            })

        return jsonify({
            'couriers': result,
            'debug_mark': 'antigravity_v1_sync_fix'
        }), 200
    except Exception as e:
        logging.error(f"Error fetching courier locations: {str(e)}", exc_info=True)
        return jsonify({'error': 'שגיאה בקבלת מיקומי השליחים'}), 500



@admin_bp.route('/stats', methods=['GET'])
@token_required
@role_required('admin')
def get_stats(current_user):
    """סטטיסטיקות כלליות"""
    try:
        from sqlalchemy import func
        from models import Courier, Customer, Invoice
        
        # ספירות בסיסיות
        total_orders = Delivery.query.count()
        pending_orders = Delivery.query.filter_by(status='pending').count()
        active_orders = Delivery.query.filter(
            Delivery.status.in_(['assigned', 'picked_up', 'in_transit'])
        ).count()
        delivered_orders = Delivery.query.filter_by(status='delivered').count()
        
        total_couriers = Courier.query.count()
        available_couriers = Courier.query.filter_by(is_available=True).count()
        
        total_customers = Customer.query.count()
        
        # הכנסות
        total_revenue = db.session.query(func.sum(Invoice.total_amount)).join(
            Delivery
        ).filter(Delivery.status == 'delivered').scalar() or 0
        
        pending_revenue = db.session.query(func.sum(Invoice.total_amount)).join(
            Delivery
        ).filter(Delivery.status != 'delivered').scalar() or 0
        
        return jsonify({
            'orders': {
                'total': total_orders,
                'pending': pending_orders,
                'active': active_orders,
                'delivered': delivered_orders
            },
            'couriers': {
                'total': total_couriers,
                'available': available_couriers,
                'busy': total_couriers - available_couriers
            },
            'customers': {
                'total': total_customers
            },
            'revenue': {
                'total': float(total_revenue),
                'pending': float(pending_revenue)
            }
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching stats: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500



@admin_bp.route('/orders/recent', methods=['GET'])
@token_required
@role_required('admin')
def get_recent_orders(current_user):
    """הזמנות אחרונות"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        deliveries = Delivery.query.order_by(
            Delivery.created_at.desc()
        ).limit(limit).all()
        
        result = []
        for d in deliveries:
            result.append({
                'id': d.id,
                'order_number': d.order_number,
                'customer': d.customer.full_name if d.customer else 'Unknown',
                'status': d.status,
                'courier': d.courier.full_name if d.courier else None,
                'total': float(d.invoice.total_amount) if d.invoice else 0,
                'created_at': d.created_at.isoformat()
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f" Error fetching recent orders: {str(e)}")
        return jsonify({'error': str(e)}), 500



@admin_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
@token_required
@role_required(['admin', 'courier']) 
def update_order_status(current_user, order_id):
    """עדכון סטטוס הזמנה"""
    try:
        data = request.json
        new_status = data.get('status')
        notes = data.get('notes', '')
        
        if not new_status:
            return jsonify({'error': 'Status is required'}), 400
        
        delivery = Delivery.query.get_or_404(order_id)
        old_status = delivery.status
        
        # עדכן סטטוס
        delivery.status = new_status
        
        # הוסף לאיסטוריית סטטוסים
        status_entry = DeliveryStatus(
            delivery_id=delivery.id,
            status=new_status,
            notes=notes,
            timestamp=datetime.utcnow()
        )
        db.session.add(status_entry)
        
        # עדכן זמנים רלוונטיים
        if new_status == 'picked_up' and not delivery.actual_pickup_time:
            delivery.actual_pickup_time = datetime.utcnow()
        elif new_status == 'delivered' and not delivery.actual_delivery_time:
            delivery.actual_delivery_time = datetime.utcnow()
            
            # עדכן מונה משלוחים של השליח
            if delivery.courier:
                delivery.courier.total_deliveries += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Status updated from {old_status} to {new_status}',
            'order_id': delivery.id,
            'new_status': new_status
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f" Error updating status: {str(e)}")
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/customers', methods=['GET'])
@token_required
@role_required('admin')
def get_customers(current_user):
    """קבלת רשימת לקוחות"""
    try:
        from models import Customer
        customers = Customer.query.join(User).all()
        return jsonify([{
            'id': c.id,
            'full_name': c.full_name,
            'company_name': c.company_name,
            'default_address': c.default_address,
            'balance': float(c.balance),
            'user': {
                'email': c.user.email,
                'phone': c.user.phone
            }
        } for c in customers]), 200
    except Exception as e:
        print(f" Error fetching customers: {str(e)}")
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_customer(current_user, customer_id):
    """מחיקת לקוח לחלוטין - רק למנהלים"""
    try:
        from models import Customer
        customer = Customer.query.get_or_404(customer_id)
        user_id = customer.user_id
        
        # Delete User first so DB-level CASCADE cleans up the Customer row automatically
        if user_id:
            user = User.query.get(user_id)
            if user and user.user_type == 'customer':
                User.query.filter_by(id=user_id).delete(synchronize_session=False)
                db.session.flush()  # Let cascade delete customer + children via FK ondelete
        else:
            # No linked user: manually delete customer and its children
            Customer.query.filter_by(id=customer_id).delete(synchronize_session=False)

        db.session.commit()
        return jsonify({'success': True, 'message': f'Customer {customer_id} deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting customer {customer_id}: {str(e)}", exc_info=True)
        return jsonify({'error': 'שגיאה במחיקת הלקוח, ייתכן שקיימות הזמנות מקושרות.'}), 500


@admin_bp.route('/couriers/<int:courier_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_courier(current_user, courier_id):
    """
    מחיקה/השבתה של שליח:
    - אם אין לשליח משלוחים בהיסטוריה: מחיקה מלאה (כולל user)
    - אם יש משלוחים: השבתה בלבד (user.is_active=False + courier.is_available=False)
    """
    try:
        from models import Courier, User, Delivery

        courier = Courier.query.get(courier_id)
        if not courier:
            return jsonify({'message': 'שליח לא נמצא'}), 404

        # Count historical deliveries for this courier
        delivery_count = Delivery.query.filter_by(courier_id=courier_id).count()

        if delivery_count == 0:
            # IMPORTANT:
            # We avoid db.session.delete(courier/user) because ORM cascades may try to lazy-load
            # related tables that are out-of-sync with SQLite schema (causing OperationalError 500).
            # Bulk deletes don't trigger relationship loading.
            Courier.query.filter_by(id=courier_id).delete(synchronize_session=False)
            if courier.user_id:
                User.query.filter_by(id=courier.user_id).delete(synchronize_session=False)

            db.session.commit()
            return jsonify({
                'action': 'deleted',
                'message': 'השליח נמחק לצמיתות מהמערכת'
            }), 200

        # Disable only (keep history)
        user = User.query.get(courier.user_id) if courier.user_id else None
        if user:
            user.is_active = False

        courier.is_available = False
        db.session.commit()

        return jsonify({
            'action': 'disabled',
            'delivery_count': delivery_count,
            'message': f'השליח הושבת. לא ניתן למחוק — יש לו {delivery_count} משלוחים בהיסטוריה'
        }), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error delete/disable courier {courier_id}: {str(e)}", exc_info=True)
        return jsonify({'error': 'שגיאה במחיקה/השבתה של השליח'}), 500


@admin_bp.route('/couriers/<int:courier_id>/delivery-count', methods=['GET'])
@token_required
@role_required('admin')
def get_courier_delivery_count(current_user, courier_id):
    """ספירת משלוחים עבור שליח לפי courier_id."""
    try:
        from models import Delivery
        count = Delivery.query.filter_by(courier_id=courier_id).count()
        return jsonify({'delivery_count': count}), 200
    except Exception as e:
        logging.error(f"Error fetching courier delivery count {courier_id}: {str(e)}", exc_info=True)
        return jsonify({'error': 'שגיאה בקבלת מספר המשלוחים של השליח'}), 500


@admin_bp.route('/couriers/available-count', methods=['GET'])
@token_required
@role_required('admin')
def get_available_couriers_count(current_user):
    """
    החזרת מספר שליחים זמינים "אמיתיים":
    מחוברים בסוקט + מסומנים זמינים במסד הנתונים.
    """
    try:
        from models import Courier
        from sockets.delivery_events import connected_couriers

        # Courier is considered "online" only if there is an active socket connection
        online_courier_ids = [cid for cid in connected_couriers.values() if cid is not None]

        if online_courier_ids:
            active = Courier.query.filter(
                Courier.is_available == True,
                Courier.id.in_(online_courier_ids)
            ).all()
        else:
            active = []

        return jsonify({
            'available_count': len(active),
            'couriers': [{'id': c.id, 'name': getattr(c, 'full_name', f'Courier {c.id}')} for c in active]
        }), 200
    except Exception as e:
        logging.error(f"Error fetching available couriers count: {str(e)}", exc_info=True)
        return jsonify({'error': 'שגיאה בקבלת מספר השליחים הזמינים'}), 500


@admin_bp.route('/couriers/candidates', methods=['GET'])
@token_required
@role_required('admin')
def get_courier_candidates(current_user):
    """
    החזרת רשימת מועמדים חדשים:
    כרגע מוגדרים כשליחים עם onboarding_status='new'.
    """
    try:
        from models import Courier, User

        # Only count candidates that are not disabled
        candidates = Courier.query.join(User).filter(
            Courier.onboarding_status == 'new',
            User.is_active == True
        ).all()

        return jsonify({
            'candidates_count': len(candidates),
            'candidates': [
                {
                    'id': c.id,
                    'name': getattr(c, 'full_name', f'Courier {c.id}'),
                    'phone': getattr(c, 'user', None).phone if getattr(c, 'user', None) else None
                }
                for c in candidates
            ]
        }), 200
    except Exception as e:
        logging.error(f"Error fetching courier candidates: {str(e)}", exc_info=True)
        return jsonify({'error': 'שגיאה בקבלת מועמדים חדשים'}), 500


@admin_bp.route('/couriers/<int:courier_id>/approve', methods=['POST'])
@token_required
@role_required('admin')
def approve_courier(current_user, courier_id):
    """אישור או דחיית קבלת שליח"""
    try:
        from models import Courier
        data = request.json
        action = data.get('action') # 'approve' or 'reject'
        reason = data.get('reason', '')
        
        courier = Courier.query.get_or_404(courier_id)
        
        if action == 'approve':
            courier.onboarding_status = 'approved'
            courier.is_available = True # Enable them
            courier.rejection_reason = None
            message = 'Courier approved successfully'
            
        elif action == 'reject':
            courier.onboarding_status = 'rejected'
            courier.is_available = False
            courier.rejection_reason = reason
            message = 'Courier rejected'
            
        else:
            return jsonify({'error': 'Invalid action'}), 400
            
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': message,
            'status': courier.onboarding_status
        }), 200
        
    except Exception as e:
        db.session.rollback()
@admin_bp.route('/users', methods=['GET'])
@token_required
@role_required('admin')
def get_all_users(current_user):
    """Get all users (with filtering)"""
    try:
        user_type = request.args.get('type')
        query = User.query
        
        if user_type:
            query = query.filter_by(user_type=user_type)
            
        users = query.order_by(User.created_at.desc()).limit(100).all()
        include_permissions = request.args.get('include_permissions', '1') != '0'

        result = []
        for u in users:
            groups = [
                {
                    'id': ug.group.id,
                    'name': ug.group.name,
                }
                for ug in u.user_groups.all()
                if ug.group
            ]

            payload = {
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'phone': u.phone,
                'user_type': u.user_type,
                'admin_role': u.admin_role,
                'is_active': u.is_active,
                'created_at': u.created_at.isoformat(),
                'groups': groups,
            }
            if include_permissions:
                payload['permissions'] = _effective_user_permission_keys(u)
            result.append(payload)

        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/groups', methods=['GET'])
@token_required
@role_required('admin')
def get_groups(current_user):
    """Get permission groups + available permissions."""
    try:
        seed_defaults = request.args.get('seed_defaults', '1') != '0'
        include_inactive = request.args.get('include_inactive', '0') == '1'

        if seed_defaults:
            for key in DEFAULT_PERMISSION_KEYS:
                _ensure_permission(key)
            db.session.commit()

        query = Group.query
        if not include_inactive:
            query = query.filter_by(is_active=True)

        groups = query.order_by(Group.name.asc()).all()
        permissions = Permission.query.order_by(Permission.permission_key.asc()).all()

        return jsonify({
            'groups': [
                {
                    'id': g.id,
                    'name': g.name,
                    'description': g.description,
                    'is_active': g.is_active,
                    'permissions': sorted(_group_permission_keys(g)),
                    'users_count': g.user_groups.count(),
                }
                for g in groups
            ],
            'available_permissions': [
                {
                    'id': p.id,
                    'permission_key': p.permission_key,
                    'resource': p.resource,
                    'action': p.action,
                    'description': p.description,
                }
                for p in permissions
            ],
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/groups', methods=['POST'])
@token_required
@role_required('admin')
def create_group(current_user):
    """Create a permission group."""
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        description = data.get('description')
        permission_keys = data.get('permission_keys') or []

        if not name:
            return jsonify({'error': 'Group name is required'}), 400

        if Group.query.filter_by(name=name).first():
            return jsonify({'error': 'Group name already exists'}), 400

        group = Group(name=name, description=description, is_active=bool(data.get('is_active', True)))
        db.session.add(group)
        db.session.flush()

        normalized_keys = sorted({str(x).strip() for x in permission_keys if str(x).strip()})
        for key in normalized_keys:
            perm = _ensure_permission(key)
            db.session.add(GroupPermission(group_id=group.id, permission_id=perm.id))

        db.session.commit()

        return jsonify({
            'success': True,
            'group': {
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'is_active': group.is_active,
                'permissions': sorted(_group_permission_keys(group)),
            }
        }), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Constraint violation while creating group'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/groups', methods=['PUT'])
@admin_bp.route('/groups/<int:group_id>', methods=['PUT'])
@token_required
@role_required('admin')
def update_group(current_user, group_id=None):
    """Update group metadata, permissions and optional users assignment."""
    try:
        data = request.get_json() or {}
        target_group_id = group_id or data.get('group_id')
        if not target_group_id:
            return jsonify({'error': 'group_id is required'}), 400

        group = Group.query.get_or_404(target_group_id)

        if 'name' in data:
            new_name = (data.get('name') or '').strip()
            if not new_name:
                return jsonify({'error': 'Group name cannot be empty'}), 400
            existing = Group.query.filter_by(name=new_name).first()
            if existing and existing.id != group.id:
                return jsonify({'error': 'Group name already exists'}), 400
            group.name = new_name

        if 'description' in data:
            group.description = data.get('description')
        if 'is_active' in data:
            group.is_active = bool(data.get('is_active'))

        if 'permission_keys' in data:
            permission_keys = data.get('permission_keys') or []
            normalized_keys = sorted({str(x).strip() for x in permission_keys if str(x).strip()})
            GroupPermission.query.filter_by(group_id=group.id).delete(synchronize_session=False)
            db.session.flush()

            for key in normalized_keys:
                perm = _ensure_permission(key)
                db.session.add(GroupPermission(group_id=group.id, permission_id=perm.id))

        if 'user_ids' in data:
            user_ids = data.get('user_ids') or []
            if not isinstance(user_ids, list):
                return jsonify({'error': 'user_ids must be a list'}), 400

            unique_user_ids = sorted({int(uid) for uid in user_ids})
            if unique_user_ids:
                existing_users = User.query.filter(User.id.in_(unique_user_ids)).all()
                if len(existing_users) != len(unique_user_ids):
                    return jsonify({'error': 'One or more users do not exist'}), 400

            UserGroup.query.filter_by(group_id=group.id).delete(synchronize_session=False)
            db.session.flush()

            for uid in unique_user_ids:
                db.session.add(UserGroup(user_id=uid, group_id=group.id, assigned_by=current_user.id))

        db.session.commit()

        return jsonify({
            'success': True,
            'group': {
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'is_active': group.is_active,
                'permissions': sorted(_group_permission_keys(group)),
                'users_count': group.user_groups.count(),
            }
        }), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Constraint violation while updating group'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>/ban', methods=['POST'])
@token_required
@role_required('admin')
def ban_user(current_user, user_id):
    """Ban/Unban a user"""
    try:
        user = User.query.get_or_404(user_id)
        data = request.json
        should_ban = data.get('ban', True)
        
        if user.id == current_user.id:
            return jsonify({'error': 'Cannot ban yourself'}), 400
            
        user.is_active = not should_ban
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f"User {'banned' if should_ban else 'unbanned'} successfully",
            'is_active': user.is_active
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# Invitation Codes
# ============================================================================

@admin_bp.route('/invitations', methods=['POST'])
@token_required
@role_required('admin')
def create_invitation(current_user):
    """Create a new invitation code"""
    try:
        from models import InvitationCode
        import uuid
        
        data = request.json
        target_role = data.get('target_role', 'courier')
        
        code = f"{target_role[:3].upper()}-{uuid.uuid4().hex[:6].upper()}"
        
        invite = InvitationCode(
            code=code,
            created_by=current_user.id,
            target_role=target_role
        )
        db.session.add(invite)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'code': code,
            'target_role': target_role
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/invitations', methods=['GET'])
@token_required
@role_required('admin')
def get_invitations(current_user):
    """Get all invitation codes"""
    try:
        from models import InvitationCode
        invites = InvitationCode.query.order_by(InvitationCode.created_at.desc()).all()
        
        return jsonify([{
            'code': i.code,
            'target_role': i.target_role,
            'is_used': i.is_used,
            'created_at': i.created_at.isoformat()
        } for i in invites]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# User Management Routes
# ============================================================================

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@token_required
@role_required('admin')
def update_user(current_user, user_id):
    """Update user profile, role metadata and groups."""
    try:
        user = User.query.get_or_404(user_id)
        data = request.json or {}

        if 'email' in data:
            user.email = data['email']
        if 'phone' in data:
            user.phone = data['phone']
        if 'username' in data:
            existing = User.query.filter_by(username=data['username']).first()
            if existing and existing.id != user.id:
                return jsonify({'error': 'Username already taken'}), 400
            user.username = data['username']

        if 'admin_role' in data and user.user_type == 'admin':
            user.admin_role = data.get('admin_role')

        if 'group_ids' in data:
            group_ids = data.get('group_ids') or []
            if not isinstance(group_ids, list):
                return jsonify({'error': 'group_ids must be a list'}), 400

            normalized_group_ids = sorted({int(gid) for gid in group_ids})
            if normalized_group_ids:
                existing_groups = Group.query.filter(Group.id.in_(normalized_group_ids)).all()
                if len(existing_groups) != len(normalized_group_ids):
                    return jsonify({'error': 'One or more groups do not exist'}), 400

            UserGroup.query.filter_by(user_id=user.id).delete(synchronize_session=False)
            db.session.flush()
            for gid in normalized_group_ids:
                db.session.add(UserGroup(user_id=user.id, group_id=gid, assigned_by=current_user.id))

        if 'two_factor_enforced' in data:
            user.two_factor_enforced_by_admin = data['two_factor_enforced']

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'User {user_id} updated successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@token_required
@role_required('admin')
def reset_user_password(current_user, user_id):
    """איפוס סיסמה למשתמש ע"י אדמין"""
    try:
        user = User.query.get_or_404(user_id)
        data = request.json
        new_password = data.get('password')
        
        if not new_password:
            return jsonify({'error': 'New password is required'}), 400
            
        user.set_password(new_password)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Password for user {user.username} has been reset'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>/toggle-active', methods=['POST'])
@token_required
@role_required('admin')
def toggle_user_active(current_user, user_id):
    """הפעלה/ביטול של חשבון משתמש"""
    try:
        user = User.query.get_or_404(user_id)
        user.is_active = not user.is_active
        db.session.commit()
        
        return jsonify({
            'success': True,
            'is_active': user.is_active,
            'message': f'User {user.username} is now {"active" if user.is_active else "inactive"}'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/backup', methods=['POST'])
@token_required
@role_required('admin')
def manual_backup(current_user):
    """Trigger a manual database backup"""
    try:
        from utils.backup import run_backup
        success, result = run_backup()
        if success:
            return jsonify({'success': True, 'message': f'Backup created: {result}'}), 200
        else:
            return jsonify({'error': f'Backup failed: {result}'}), 500
    except Exception as e:
        logging.error(f"Manual backup error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ============================================================================
# Admin MFA (TOTP)
# ============================================================================

import pyotp
import qrcode
import io
import base64

@admin_bp.route('/mfa/setup', methods=['POST'])
@token_required
@role_required('admin')
def mfa_setup(current_user):
    """Generates secret + QR code for MFA"""
    if current_user.mfa_enabled:
        return jsonify({'error': 'MFA is already enabled'}), 400
    
    secret = pyotp.random_base32()
    current_user.totp_secret = secret
    db.session.commit()
    
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=current_user.email, issuer_name="TzirDelivery")
    img = qrcode.make(provisioning_uri)
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return jsonify({
        'secret': secret,
        'qr_code': f"data:image/png;base64,{img_str}"
    }), 200

@admin_bp.route('/mfa/verify', methods=['POST'])
@token_required
@role_required('admin')
def mfa_verify(current_user):
    """Confirms setup with first code"""
    data = request.json
    code = data.get('code')
    
    if not code or not current_user.totp_secret:
        return jsonify({'error': 'Invalid request'}), 400
        
    totp = pyotp.TOTP(current_user.totp_secret)
    if totp.verify(code):
        current_user.mfa_enabled = True
        import secrets
        recovery = secrets.token_hex(16)
        current_user.mfa_recovery_code = recovery
        db.session.commit()
        return jsonify({
            'success': True, 
            'message': 'MFA Enabled Successfully',
            'recovery_code': recovery
        }), 200
    
    return jsonify({'error': 'Invalid code'}), 400

@admin_bp.route('/mfa/validate', methods=['POST'])
def mfa_validate():
    """Validates code during login using mfa_token, returns JWT"""
    data = request.json
    mfa_token = data.get('mfa_token')
    code = data.get('code')
    
    if not mfa_token or not code:
        return jsonify({'error': 'Missing token or code'}), 400
        
    try:
        import os, jwt as pyjwt
        payload = pyjwt.decode(mfa_token, os.environ.get('SECRET_KEY', 'default-key'), algorithms=["HS256"])
        if not payload.get('mfa_pending'):
            return jsonify({'error': 'Invalid token type'}), 400
            
        user_id = payload.get('user_id')
        user = User.query.get(user_id)
        
        if not user or not user.mfa_enabled or not user.totp_secret:
            return jsonify({'error': 'MFA not correctly set up'}), 400
            
        totp = pyotp.TOTP(user.totp_secret)
        if totp.verify(code) or code == user.mfa_recovery_code:
            from flask_jwt_extended import create_access_token, create_refresh_token
            import datetime
            access_token = create_access_token(
                identity=str(user.id),
                additional_claims={'username': user.username, 'user_type': user.user_type},
                expires_delta=datetime.timedelta(minutes=60)
            )
            refresh_token = create_refresh_token(identity=str(user.id))
            
            return jsonify({
                'success': True,
                'token': access_token,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email,
                    'user_type': user.user_type
                }
            }), 200
            
        return jsonify({'error': 'Invalid code'}), 400
        
    except Exception as e:
        return jsonify({'error': 'Invalid or expired MFA token', 'details': str(e)}), 401

@admin_bp.route('/blocked-ips', methods=['GET'])
@token_required
@role_required('admin')
def get_blocked_ips_route(current_user):
    """View all currently blocked IPs"""
    try:
        from utils.ip_blocker import get_blocked_ips
        ips = get_blocked_ips()
        return jsonify(ips), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/blocked-ips/<ip>', methods=['DELETE'])
@token_required
@role_required('admin')
def unblock_ip_route(current_user, ip):
    """Unblock a specific IP"""
    try:
        from utils.ip_blocker import remove_blocked_ip
        if remove_blocked_ip(ip):
            return jsonify({'success': True, 'message': f'IP {ip} has been unblocked'}), 200
        return jsonify({'error': 'IP not found in blocked list'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
