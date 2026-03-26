from flask import Blueprint, jsonify, request
from models import db, Delivery, Customer, DeliveryProtocolConfig, PickupPoint, DeliveryPoint
from utils.decorators import token_required, role_required
import logging
from datetime import datetime
import uuid

customer_orders_bp = Blueprint('customer_orders', __name__)

def calculate_order_price(protocol_slug, distance_km, is_urgent=False):
    config = DeliveryProtocolConfig.query.filter_by(slug=protocol_slug).first()
    if not config:
        return None
        
    base_price = 25.0  # base flat rate in ILS
    distance_price = distance_km * 3.5  # 3.5 ILS per km
    
    subtotal = (base_price + distance_price) * float(config.pricing_multiplier)
    
    if is_urgent:
        subtotal *= 1.5  # 50% urgent surcharge
    
    vat = subtotal * 0.17  # 17% VAT
    total = subtotal + vat
    
    return {
        "base": round(base_price, 2),
        "distance": round(distance_price, 2),
        "multiplier": float(config.pricing_multiplier),
        "subtotal": round(subtotal, 2),
        "vat": round(vat, 2),
        "total": round(total, 2),
        "currency": "ILS"
    }

@customer_orders_bp.route('', methods=['POST'])
@token_required
@role_required('customer')
def create_customer_order(current_user):
    """Create new customer order"""
    try:
        data = request.json
        customer = Customer.query.filter_by(user_id=current_user.id).first()
        if not customer:
            return jsonify({'error': 'Customer profile not found'}), 404
            
        protocol_slug = data.get('protocol_slug')
        pickup_data = data.get('pickup')
        delivery_data = data.get('delivery')
        is_urgent = data.get('is_urgent', False)
        
        # Create points
        pickup = PickupPoint(
            address=pickup_data['address'],
            lat=pickup_data['lat'],
            lng=pickup_data['lng'],
            contact_name=pickup_data.get('contact_name'),
            contact_phone=pickup_data.get('contact_phone')
        )
        db.session.add(pickup)
        
        delivery_pt = DeliveryPoint(
            address=delivery_data['address'],
            lat=delivery_data['lat'],
            lng=delivery_data['lng'],
            contact_name=delivery_data.get('contact_name'),
            contact_phone=delivery_data.get('contact_phone')
        )
        db.session.add(delivery_pt)
        db.session.flush()
        
        # Calculate price (mock distance for now or use geopy if available)
        distance = data.get('distance_km', 5.0) 
        price_info = calculate_order_price(protocol_slug, distance, is_urgent)
        
        new_delivery = Delivery(
            order_number=f"TZR-{uuid.uuid4().hex[:8].upper()}",
            customer_id=customer.id,
            pickup_point_id=pickup.id,
            delivery_point_id=delivery_pt.id,
            protocol_slug=protocol_slug,
            status='pending',
            delivery_fee=price_info['total'] if price_info else 0.0,
            distance_km=distance,
            notes=data.get('notes')
        )
        
        db.session.add(new_delivery)
        db.session.commit()
        
        return jsonify({
            'message': 'Order created successfully',
            'order_id': new_delivery.id,
            'order_number': new_delivery.order_number,
            'price': price_info
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating customer order: {e}")
        return jsonify({'error': str(e)}), 500

@customer_orders_bp.route('/<int:order_id>', methods=['GET'])
@token_required
@role_required('customer')
def get_order_details(current_user, order_id):
    """Get order details + current step"""
    try:
        customer = Customer.query.filter_by(user_id=current_user.id).first()
        order = Delivery.query.filter_by(id=order_id, customer_id=customer.id).first()
        if not order:
            return jsonify({'error': 'Order not found'}), 404
            
        return jsonify({
            'id': order.id,
            'order_number': order.order_number,
            'status': order.status,
            'protocol_slug': order.protocol_slug,
            'created_at': order.created_at.isoformat(),
            'price': order.delivery_fee,
            'pickup': order.pickup_point.address,
            'delivery': order.delivery_point.address
        }), 200
    except Exception as e:
        logging.error(f"Error fetching order: {e}")
        return jsonify({'error': str(e)}), 500

@customer_orders_bp.route('/history', methods=['GET'])
@token_required
@role_required('customer')
def get_order_history(current_user):
    """Customer's order history"""
    try:
        customer = Customer.query.filter_by(user_id=current_user.id).first()
        orders = Delivery.query.filter_by(customer_id=customer.id).order_by(Delivery.created_at.desc()).all()
        
        return jsonify([{
            'id': o.id,
            'order_number': o.order_number,
            'status': o.status,
            'created_at': o.created_at.isoformat(),
            'price': o.delivery_fee
        } for o in orders]), 200
    except Exception as e:
        logging.error(f"Error fetching history: {e}")
        return jsonify({'error': str(e)}), 500

@customer_orders_bp.route('/<int:order_id>/cancel', methods=['POST'])
@token_required
@role_required('customer')
def cancel_order(current_user, order_id):
    """Cancel (only if status=pending)"""
    try:
        customer = Customer.query.filter_by(user_id=current_user.id).first()
        order = Delivery.query.filter_by(id=order_id, customer_id=customer.id).first()
        if not order:
            return jsonify({'error': 'Order not found'}), 404
            
        if order.status != 'pending':
            return jsonify({'error': 'Only pending orders can be cancelled'}), 400
            
        order.status = 'cancelled'
        db.session.commit()
        
        return jsonify({'message': 'Order cancelled'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error cancelling order: {e}")
        return jsonify({'error': str(e)}), 500
