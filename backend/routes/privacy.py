from flask import Blueprint, jsonify, send_file, request
from models import db, User, Courier, Customer, AuditLog
from utils.decorators import token_required
from datetime import datetime
import json
import io
import random
import string

privacy_bp = Blueprint('privacy', __name__)

@privacy_bp.route('/export', methods=['GET'])
@token_required
def export_data(current_user):
    """
    GDPR Right to Data Portability: Export all user data as JSON
    """
    try:
        user_data = {
            'username': current_user.username,
            'email': current_user.email,
            'phone': current_user.phone,
            'role': current_user.user_type,
            'created_at': current_user.created_at.isoformat(),
            'last_login': current_user.updated_at.isoformat()
        }

        # Fetch role-specific data
        if current_user.user_type == 'courier' and current_user.courier:
            courier = current_user.courier
            user_data['profile'] = {
                'full_name': courier.full_name,
                'vehicle': courier.vehicle_type,
                'license_plate': courier.license_plate,
                'rating': courier.rating,
                'total_deliveries': courier.total_deliveries
            }
            # Add recent deliveries (limit to last 50 for performance)
            deliveries = [
                {
                    'id': d.order_number,
                    'date': d.created_at.isoformat(),
                    'status': d.status,
                    'fee': float(d.invoice.total_amount) if d.invoice else 0
                }
                for d in courier.deliveries.limit(50).all()
            ]
            user_data['deliveries_history'] = deliveries

        elif current_user.user_type == 'customer' and current_user.customer:
            customer = current_user.customer
            user_data['profile'] = {
                'full_name': customer.full_name,
                'company': customer.company_name,
                'address': customer.default_address
            }
            orders = [
                {
                    'id': d.order_number,
                    'date': d.created_at.isoformat(),
                    'status': d.status,
                    'cost': float(d.invoice.total_amount) if d.invoice else 0
                }
                for d in customer.deliveries.limit(50).all()
            ]
            user_data['orders_history'] = orders

        # Audit Log for this action
        from utils.audit import log_audit
        log_audit(
            action='DATA_EXPORT',
            user_id=current_user.id,
            details='User exported their personal data (GDPR)',
            status='SUCCESS'
        )

        return jsonify(user_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@privacy_bp.route('/account', methods=['DELETE'])
@token_required
def delete_account(current_user):
    """
    GDPR Right to be Forgotten: Soft delete and anonymize PII
    """
    try:
        # Prevent admin deletion via API for safety
        if current_user.user_type == 'admin':
            return jsonify({'error': 'Admins cannot delete their account via API. Contact support.'}), 403

        # Anonymize User Data
        original_username = current_user.username
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        
        current_user.username = f"deleted_user_{random_suffix}"
        current_user.email = f"deleted_{random_suffix}@anon.com"
        current_user.phone = "0000000000"
        current_user.password_hash = "DELETED_ACCOUNT"
        current_user.is_active = False
        current_user.locked_until = datetime(2099, 12, 31)

        # Anonymize Role Data
        if current_user.courier:
            current_user.courier.full_name = "Deleted Courier"
            current_user.courier.national_id = None
            current_user.courier.drivers_license_number = None
            current_user.courier.is_available = False
        
        elif current_user.customer:
            current_user.customer.full_name = "Deleted Customer"
            current_user.customer.contact_person = None
            current_user.customer.default_address = None
            current_user.customer.billing_address = None

        # Audit Log (Must happen BEFORE commit to capture ID, though data is anon now)
        # We log this as a critical event.
        # Note: We keep the AuditLog entry pointing to the user *ID* (which doesn't change), 
        # but the User record itself is anonymized.
        from utils.audit import log_audit
        log_audit(
            action='ACCOUNT_DELETION',
            user_id=current_user.id,
            resource_type='User',
            resource_id=current_user.id,
            details=f"User {original_username} requested Right to be Forgotten. Account anonymized.",
            status='SUCCESS'
        )

        db.session.commit()
        
        return jsonify({'message': 'Account deleted successfully. You have been logged out.'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
