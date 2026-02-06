from flask import Blueprint, request, jsonify
from datetime import datetime
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import db, Delivery, DeliveryStatus, User
from utils.decorators import token_required, role_required
import logging

admin_bp = Blueprint('admin', __name__)

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
        print(f"❌ Error fetching recent orders: {str(e)}")
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
        print(f"❌ Error updating status: {str(e)}")
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
        print(f"❌ Error fetching customers: {str(e)}")
        return jsonify({'error': str(e)}), 500


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
        
        return jsonify([{
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'phone': u.phone,
            'user_type': u.user_type,
            'is_active': u.is_active,
            'is_two_factor_enabled': u.is_two_factor_enabled,
            'created_at': u.created_at.isoformat()
        } for u in users]), 200
    except Exception as e:
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
    """עדכון פרטי משתמש"""
    try:
        user = User.query.get_or_404(user_id)
        data = request.json
        
        # עריכת שדות בסיסיים
        if 'email' in data:
            user.email = data['email']
        if 'phone' in data:
            user.phone = data['phone']
        if 'username' in data:
            # וודא ששם המשתמש החדש לא תפוס
            from models import User
            existing = User.query.filter_by(username=data['username']).first()
            if existing and existing.id != user.id:
                return jsonify({'error': 'Username already taken'}), 400
            user.username = data['username']
            
        # עריכת הגדרות 2FA
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

@admin_bp.route('/export/users', methods=['GET'])
@token_required
@role_required('admin')
def export_users_csv(current_user):
    """Export all users to CSV"""
    try:
        import csv
        import io
        from flask import make_response

        # Query all users
        users = User.query.all()

        # Create CSV in memory
        si = io.StringIO()
        cw = csv.writer(si)
        
        # Header
        cw.writerow(['ID', 'Username', 'Email', 'Phone', 'Type', 'Active', 'Created At'])
        
        # Data
        for u in users:
            cw.writerow([
                u.id,
                u.username,
                u.email,
                u.phone,
                u.user_type,
                u.is_active,
                u.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])
            
        output = make_response(si.getvalue())
        output.headers["Content-Disposition"] = "attachment; filename=users_export.csv"
        output.headers["Content-type"] = "text/csv"
        return output
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500