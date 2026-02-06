from flask import Blueprint, request, jsonify
from models import db, Customer, User
import logging
from utils.decorators import token_required, role_required

customers_bp = Blueprint('customers', __name__)

@customers_bp.route('', methods=['GET'])
@token_required
@role_required('admin')
def get_customers(current_user):
    """קבלת כל הלקוחות"""
    try:
        customers = Customer.query.all()
        
        result = []
        for c in customers:
            result.append({
                'id': c.id,
                'user_id': c.user_id,
                'full_name': c.full_name,
                'email': c.user.email if c.user else '',
                'phone': c.user.phone if c.user else '',
                'company_name': c.company_name,
                'business_id': c.business_id, # H.P.
                'contact_person': c.contact_person,
                'balance': float(c.balance),
                'credit_limit': float(c.credit_limit),
                'total_orders': c.total_orders,
                'rating': float(c.rating),
                'is_active': c.user.is_active if c.user else False,
                'two_factor_enforced_by_admin': c.user.two_factor_enforced_by_admin if c.user else False
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        logging.error(f"Error fetching customers: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@customers_bp.route('', methods=['POST'])
@token_required
@role_required('admin')
def create_customer(current_user):
    """יצירת לקוח עסקי/פרטי חדש"""
    try:
        data = request.json
        
        # Validations
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password are required'}), 400
            
        existing_user = User.query.filter_by(username=data['username']).first()
        if existing_user:
            return jsonify({'error': 'Username already exists'}), 400
            
        # Create User
        user = User(
            username=data['username'],
            email=data.get('email', f"{data['username']}@customer.com"),
            phone=data.get('phone', ''),
            user_type='customer'
        )
        user.set_password(data['password'])
        db.session.add(user)
        db.session.flush()
        
        # Create Customer Profile
        customer = Customer(
            user_id=user.id,
            full_name=data.get('full_name', data['username']),
            company_name=data.get('company_name'),
            business_id=data.get('business_id'),
            contact_person=data.get('contact_person'),
            billing_address=data.get('billing_address'),
            default_address=data.get('default_address'),
            credit_limit=data.get('credit_limit', 0.0),
            balance=0.0
        )
        db.session.add(customer)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'id': customer.id,
            'message': 'Customer created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating customer: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<int:customer_id>', methods=['PUT'])
@token_required
@role_required('admin')
def update_customer(current_user, customer_id):
    """עדכון פרטי לקוח"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        data = request.json
        
        if 'full_name' in data:
            customer.full_name = data['full_name']
        if 'company_name' in data:
            customer.company_name = data['company_name']
        if 'business_id' in data:
            customer.business_id = data['business_id']
        if 'contact_person' in data:
            customer.contact_person = data['contact_person']
        if 'credit_limit' in data:
            customer.credit_limit = data['credit_limit']
        if 'billing_address' in data:
            customer.billing_address = data['billing_address']
            
        # Update User fields if needed
        if customer.user:
            if 'phone' in data:
                customer.user.phone = data['phone']
            if 'email' in data:
                customer.user.email = data['email']
                
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Customer updated'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
