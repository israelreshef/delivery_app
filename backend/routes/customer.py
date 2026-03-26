from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import (
    DeliveryProtocolConfig, 
    DeliveryProtocolTemplate, 
    Delivery, 
    Customer, 
    CustomerWallet, 
    WalletTransaction,
    PickupPoint,
    DeliveryPoint,
    Address
)
from utils.pricing import calculate_order_price
from datetime import datetime
import uuid

customer_bp = Blueprint('customer_api', __name__)

# ============================================================================
# Protocol Endpoints (Public)
# ============================================================================

@customer_bp.route('/protocols', methods=['GET'])
def get_protocols():
    """List all available delivery protocols."""
    configs = DeliveryProtocolConfig.query.filter_by(is_active=True).all()
    return jsonify([{
        'name': c.name,
        'slug': c.slug,
        'category': c.category,
        'pricing_tier': c.pricing_tier,
        'pricing_multiplier': float(c.pricing_multiplier),
        'requires_id_verification': c.requires_id_verification,
        'requires_photo': c.requires_photo,
        'requires_signature': c.requires_signature,
        'requires_otp': c.requires_otp
    } for c in configs])

@customer_bp.route('/protocols/categories', methods=['GET'])
def get_categories():
    """List unique protocol categories."""
    categories = db.session.query(DeliveryProtocolConfig.category).distinct().all()
    return jsonify([c[0] for c in categories])

@customer_bp.route('/protocols/<slug>', methods=['GET'])
def get_protocol_detail(slug):
    """Get detailed info about a specific protocol including its steps."""
    config = DeliveryProtocolConfig.query.filter_by(slug=slug).first_or_404()
    template = DeliveryProtocolTemplate.query.filter_by(code=config.base_protocol).first()
    
    return jsonify({
        'name': config.name,
        'slug': config.slug,
        'category': config.category,
        'steps': template.steps if template else [],
        'pricing_multiplier': float(config.pricing_multiplier),
        'requirements': {
            'id_verification': config.requires_id_verification,
            'photo': config.requires_photo,
            'signature': config.requires_signature,
            'otp': config.requires_otp
        }
    })

# ============================================================================
# Order Endpoints (Protected)
# ============================================================================

@customer_bp.route('/orders/customer', methods=['POST'])
@jwt_required()
def create_customer_order():
    """Create a new delivery order for the authenticated customer."""
    user_id = get_jwt_identity()
    customer = Customer.query.filter_by(user_id=user_id).first()
    if not customer:
        return jsonify({"error": "Customer profile not found"}), 404

    data = request.json
    # Basic validation
    required = ['protocol_slug', 'pickup', 'delivery', 'package']
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400

    protocol_slug = data['protocol_slug']
    config = DeliveryProtocolConfig.query.filter_by(slug=protocol_slug).first()
    if not config:
        return jsonify({"error": "Invalid protocol"}), 400

    # 1. Handle Addresses and Points
    # Simplified for now: assume data contains address strings or objects
    # In a real app, we'd look up or create Address objects
    
    # 2. Calculate Price
    distance = data.get('distance_km', 5.0) # Default or calculated
    price_info = calculate_order_price(
        distance_km=distance,
        protocol_slug=protocol_slug,
        package_size=data['package'].get('size', 'medium'),
        urgency=data.get('urgency', 'standard')
    )
    total_price = price_info['final_price']

    # 3. Handle Payment (Wallet vs Card)
    payment_method = data.get('payment_method', 'wallet')
    
    if payment_method == 'wallet':
        wallet = CustomerWallet.query.filter_by(customer_id=customer.id).first()
        if not wallet or wallet.balance < total_price:
            return jsonify({
                "error": "Insufficient wallet balance",
                "required": total_price,
                "current": float(wallet.balance) if wallet else 0
            }), 402
        
        # Deduct from wallet
        wallet.balance -= total_price
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            amount=-total_price,
            transaction_type='payment',
            reference_id=f"PENDING_ORDER_{uuid.uuid4().hex[:8]}",
            description=f"Payment for {config.name}"
        )
        db.session.add(transaction)
    
    # 4. Create the Delivery Record
    # This is a simplified creation, assuming PickupPoint/DeliveryPoint are handled
    # In practice, we'd need to create them or use IDs passed in 'data'
    
    # Mocking Point Creation for this phase
    pickup_addr = Address(street=data['pickup']['address'], city="Tel Aviv", building_number="1")
    delivery_addr = Address(street=data['delivery']['address'], city="Tel Aviv", building_number="2")
    db.session.add_all([pickup_addr, delivery_addr])
    db.session.flush()

    pp = PickupPoint(address_id=pickup_addr.id, contact_name=customer.full_name, contact_phone=customer.phone)
    dp = DeliveryPoint(address_id=delivery_addr.id, recipient_name=data['delivery']['recipient_name'], recipient_phone=data['delivery']['recipient_phone'])
    db.session.add_all([pp, dp])
    db.session.flush()

    delivery = Delivery(
        order_number=f"TZ-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
        customer_id=customer.id,
        pickup_point_id=pp.id,
        delivery_point_id=dp.id,
        status='pending',
        protocol_slug=protocol_slug,
        delivery_fee=total_price,
        distance_km=distance,
        package_description=data['package'].get('description', '')
    )
    db.session.add(delivery)
    
    # Update reference_id for wallet transaction if processed
    if payment_method == 'wallet':
        transaction.reference_id = delivery.order_number

    db.session.commit()

    return jsonify({
        "message": "Order created successfully",
        "order_number": delivery.order_number,
        "price": total_price
    }), 201

@customer_bp.route('/orders/customer/history', methods=['GET'])
@jwt_required()
def get_customer_order_history():
    """Retrieve history of orders for the authenticated customer."""
    user_id = get_jwt_identity()
    customer = Customer.query.filter_by(user_id=user_id).first()
    if not customer:
        return jsonify({"error": "Customer profile not found"}), 404

    deliveries = Delivery.query.filter_by(customer_id=customer.id).order_by(Delivery.created_at.desc()).all()
    
    return jsonify([{
        'order_number': d.order_number,
        'status': d.status,
        'created_at': d.created_at.isoformat(),
        'price': float(d.delivery_fee),
        'protocol': d.protocol_slug
    } for d in deliveries])

@customer_bp.route('/orders/customer/<int:order_id>', methods=['GET'])
@jwt_required()
def get_customer_order_detail(order_id):
    """Get detailed information about a specific order."""
    user_id = get_jwt_identity()
    customer = Customer.query.filter_by(user_id=user_id).first()
    
    delivery = Delivery.query.filter_by(id=order_id, customer_id=customer.id).first_or_404()
    
    return jsonify({
        'order_number': delivery.order_number,
        'status': delivery.status,
        'price': float(delivery.delivery_fee),
        'created_at': delivery.created_at.isoformat(),
        'pickup': delivery.pickup_point.address.street,
        'delivery': delivery.delivery_point.address.street,
        'recipient': delivery.delivery_point.recipient_name,
        'protocol': delivery.protocol_slug
    })

@customer_bp.route('/orders/customer/<int:order_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_customer_order(order_id):
    """Cancel an order and refund to wallet if applicable."""
    user_id = get_jwt_identity()
    customer = Customer.query.filter_by(user_id=user_id).first()
    
    delivery = Delivery.query.filter_by(id=order_id, customer_id=customer.id).first_or_404()
    
    if delivery.status not in ['pending']:
        return jsonify({"error": f"Cannot cancel order in status: {delivery.status}"}), 400
    
    delivery.status = 'cancelled'
    
    # Refund to wallet
    wallet = CustomerWallet.query.filter_by(customer_id=customer.id).first()
    if wallet:
        wallet.balance += delivery.delivery_fee
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            amount=delivery.delivery_fee,
            transaction_type='refund',
            reference_id=delivery.order_number,
            description="Refund for cancelled order"
        )
        db.session.add(transaction)
    
    db.session.commit()
    return jsonify({"message": "Order cancelled and refunded"})

# ============================================================================
# Wallet Endpoints (Protected)
# ============================================================================

@customer_bp.route('/wallet/balance', methods=['GET'])
@jwt_required()
def get_wallet_balance():
    """Get current wallet balance and recent transactions."""
    user_id = get_jwt_identity()
    customer = Customer.query.filter_by(user_id=user_id).first()
    
    wallet = CustomerWallet.query.filter_by(customer_id=customer.id).first()
    if not wallet:
        # Auto-create wallet if missing
        wallet = CustomerWallet(customer_id=customer.id, balance=0.0)
        db.session.add(wallet)
        db.session.commit()
    
    transactions = wallet.transactions.order_by(WalletTransaction.created_at.desc()).limit(10).all()
    
    return jsonify({
        'balance': float(wallet.balance),
        'currency': wallet.currency,
        'transactions': [{
            'amount': float(t.amount),
            'type': t.transaction_type,
            'status': t.status,
            'date': t.created_at.isoformat(),
            'description': t.description
        } for t in transactions]
    })

@customer_bp.route('/wallet/topup', methods=['POST'])
@jwt_required()
def wallet_topup():
    """Top-up wallet via SmartBee payment simulation."""
    user_id = get_jwt_identity()
    customer = Customer.query.filter_by(user_id=user_id).first()
    
    data = request.json
    amount = data.get('amount')
    if not amount or amount <= 0:
        return jsonify({"error": "Invalid amount"}), 400
    
    # Business Logic: Enforce a reasonable maximum top-up per request
    MAX_TOPUP_ILS = 5000
    if amount > MAX_TOPUP_ILS:
        return jsonify({"error": f"Maximum top-up per transaction is {MAX_TOPUP_ILS} ILS"}), 400
    
    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount format"}), 400
    
    wallet = CustomerWallet.query.filter_by(customer_id=customer.id).first()
    
    # Simulate SmartBee Success
    wallet.balance += amount
    wallet.last_topup_at = datetime.utcnow()
    
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        amount=amount,
        transaction_type='topup',
        payment_method='smartbee',
        reference_id=f"SB-{uuid.uuid4().hex[:10].upper()}",
        description="Wallet top-up via Credit Card"
    )
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        "message": "Top-up successful",
        "new_balance": float(wallet.balance)
    })

# ============================================================================
# Business Customer Endpoints
# ============================================================================

@customer_bp.route('/business/register', methods=['POST'])
@jwt_required()
def register_business():
    """Convert private customer to business customer."""
    user_id = get_jwt_identity()
    customer = Customer.query.filter_by(user_id=user_id).first()
    
    data = request.json
    customer.customer_type = 'business'
    customer.company_name = data.get('company_name')
    customer.tax_id = data.get('tax_id')
    customer.billing_address = data.get('billing_address')
    
    db.session.commit()
    return jsonify({"message": "Business profile updated"})
