from flask import Blueprint, request, jsonify
from extensions import db, socketio
from models import Delivery, Address, PickupPoint, DeliveryPoint, Customer
from utils.decorators import api_key_required
from datetime import datetime, timedelta
import random
import string
import logging

external_api_bp = Blueprint('external_api', __name__)

def generate_order_number():
    """Generate a unique order number like API-7382-X9"""
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"API-{datetime.utcnow().strftime('%m%d')}-{suffix}"

@external_api_bp.route('/orders', methods=['POST'])
@api_key_required
def create_order():
    """
    Endpoint for external platforms (Shopify/WooCommerce) to create orders.
    Payload should check:
    {
        "merchant_order_id": "1001",
        "customer": {
            "name": "Israel Israeli",
            "phone": "050-1234567",
            "email": "client@example.com"
        },
        "delivery_address": {
            "city": "Tel Aviv",
            "street": "Dizengoff",
            "number": "100",
            "floor": "3",
            "apartment": "12"
        },
        "pickup_address": { ... } (Optional, otherwise uses merchant default),
        "package_details": {
            "weight": 2.5,
            "description": "Shoes - Box A"
        }
    }
    """
    data = request.get_json()
    
    try:
        # 1. Validate Basic Data
        customer_data = data.get('customer')
        delivery_addr_data = data.get('delivery_address')
        
        if not customer_data or not delivery_addr_data:
             return jsonify({'error': 'Missing customer or delivery address data'}), 400

        # 2. Find or Create Customer (Simplified for API match)
        # In a real plugin, we might link this to the API Key owner
        # For now, we'll look up by phone or create a "Guest API" customer
        
        # 3. Create Addresses
        delivery_address = Address(
            city=delivery_addr_data.get('city'),
            street=delivery_addr_data.get('street'),
            building_number=delivery_addr_data.get('number', '0'),
            floor=delivery_addr_data.get('floor'),
            apartment=delivery_addr_data.get('apartment'),
            notes=data.get('notes', 'External Order')
        )
        db.session.add(delivery_address)
        db.session.flush() # Get ID
        
        # Create Delivery Point
        delivery_point = DeliveryPoint(
            address_id=delivery_address.id,
            recipient_name=customer_data.get('name'),
            recipient_phone=customer_data.get('phone'),
            is_residential=True
        )
        db.session.add(delivery_point)
        db.session.flush() # CRITICAL: Get ID for Delivery creation
        
        # 4. Handle Pickup Point (Default to a known ID or create from payload)
        # For MVP, let's assume specific pickup point ID 1 (Main Warehouse) if not provided
        # Or create ad-hoc pickup
        pickup_point_id = 1 
        if data.get('pickup_address'):
             p_addr_data = data.get('pickup_address')
             p_addr = Address(
                city=p_addr_data.get('city'),
                 street=p_addr_data.get('street'),
                 building_number=p_addr_data.get('number', '1')
             )
             db.session.add(p_addr)
             db.session.flush()
             
             p_point = PickupPoint(
                 address_id=p_addr.id,
                 contact_name="Merchant Sender",
                 contact_phone="000-0000000"
             )
             db.session.add(p_point)
             db.session.flush()
             pickup_point_id = p_point.id
        
        # 5. Create Delivery
        new_order = Delivery(
            order_number=generate_order_number(),
            customer_id=1, # Default to Demo Customer for now, or fetch from DB
            pickup_point_id=pickup_point_id,
            delivery_point_id=delivery_point.id,
            status='pending',
            package_description=data.get('package_details', {}).get('description', 'Standard Package'),
            package_weight=data.get('package_details', {}).get('weight', 1.0)
        )
        
        db.session.add(new_order)
        db.session.commit()
        
        # 6. Notify System
        socketio.emit('new_order', {
            'id': new_order.id,
            'order_number': new_order.order_number,
            'status': 'pending'
        })
        
        return jsonify({
            'success': True,
            'order_id': new_order.id,
            'order_number': new_order.order_number,
            'tracking_url': f"https://app.tzir.com/track/{new_order.order_number}"
        }), 201

    except Exception as e:
        db.session.rollback()
        logging.error(f"API Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
