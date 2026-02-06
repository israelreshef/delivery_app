from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import uuid

# Import from parent directory
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import db, Delivery, Address, PickupPoint, DeliveryPoint, Customer, User, Pricing, Invoice
from utils.decorators import token_required, role_required
import logging

orders_bp = Blueprint('orders', __name__)

from utils.pricing import PricingEngine

# Old calculate_price removed - using PricingEngine.calculate_price directly



@orders_bp.route('/create', methods=['POST'])
@orders_bp.route('', methods=['POST'])
@token_required
# @role_required(['admin', 'customer']) # Temporarily disabled for dev flow if needed, but best to keep
def create_order(current_user=None):
    """יצירת הזמנה חדשה - תומך במבנה Wizard המורכב"""
    
    # [DEV MODE] Fallback user
    if not current_user:
        current_user = User.query.filter_by(user_type='admin').first() or User.query.first()

    logging.info("Received create_order request (Wizard Flow)") 
    try:
        data = request.json
        # print(f"📦 Payload: {data}") # Debugging
        
        # --- חילוץ אובייקטים מקוננים (Wizard Structure) ---
        sender_data = data.get('sender', {})
        recipient_data = data.get('recipient', {})
        package_data = data.get('package', {})
        service_data = data.get('service', {})
        
        # Fallback fields for old API compatibility
        if not sender_data and 'customer_phone' in data:
            sender_data = {
                'senderName': data.get('customer_name'),
                'senderPhone': data.get('customer_phone'),
                'senderAddress': {'street': data.get('pickup_address'), 'notes': data.get('notes')}
            }
        
        # 1. טיפול בלקוח/יוצר ההזמנה
        # במצב אידיאלי, current_user הוא הלקוח.
        # אם זה אדמין שיוצר עבור לקוח, או אורח (בעתיד), נשתמש בנתוני השולח.
        
        customer_name = sender_data.get('senderName', current_user.username)
        customer_phone = sender_data.get('senderPhone', current_user.phone)
        
        customer = None
        
        # Priority 1: Check if sender phone belongs to an existing user/customer
        existing_user = User.query.filter_by(phone=customer_phone).first()
        if existing_user:
             customer = Customer.query.filter_by(user_id=existing_user.id).first()
             if not customer:
                 # User exists but no customer profile -> Create one
                 customer = Customer(user_id=existing_user.id, full_name=customer_name or existing_user.username)
                 db.session.add(customer)
                 db.session.flush()
        
        # Priority 2: If current user is Customer, use them (fallback)
        if not customer and current_user.user_type == 'customer':
             customer = Customer.query.filter_by(user_id=current_user.id).first()
             if not customer:
                 customer = Customer(user_id=current_user.id, full_name=current_user.username or customer_name)
                 db.session.add(customer)
                 db.session.flush()

        # Priority 3: If still no customer (e.g. Admin creating for new person), Create new User+Customer
        if not customer:
             # Create new "Guest" User
             import secrets
             from werkzeug.security import generate_password_hash
             
             # Generate random password
             temp_password = secrets.token_urlsafe(8)
             new_username = customer_phone # Use phone as username for simplicity
             
             # Check if username taken (unlikely if phone check passed, but possible with different phone)
             if User.query.filter_by(username=new_username).first():
                 new_username = f"{new_username}_{secrets.token_hex(2)}"
             
             new_user = User(
                 username=new_username, 
                 email=f"{customer_phone}@guest.local", # Dummy email
                 phone=customer_phone,
                 user_type='customer'
             )
             new_user.password_hash = generate_password_hash(temp_password)
             
             db.session.add(new_user)
             db.session.flush()
             
             customer = Customer(user_id=new_user.id, full_name=customer_name)
             db.session.add(customer)
             db.session.flush()
             
             logging.info(f"Created new guest user for {customer_name} ({customer_phone})")
        
        if not customer:
             # Fail-safe
             return jsonify({'error': 'Customer profile not found for user'}), 400

        # 2. כתובת איסוף (Sender Address)
        s_addr = sender_data.get('senderAddress', {})
        pickup_address_obj = Address(
            street=s_addr.get('street', 'Unknown'),
            city=s_addr.get('city', 'Unknown'),
            building_number=s_addr.get('number', '0'),
            floor=s_addr.get('floor'),
            apartment=s_addr.get('apartment'),
            entrance=s_addr.get('entrance'),
            latitude=s_addr.get('lat'),
            longitude=s_addr.get('lon'),
            notes=s_addr.get('notes')
        )
        db.session.add(pickup_address_obj)
        db.session.flush()
        
        pickup_point = PickupPoint(
            address_id=pickup_address_obj.id,
            contact_name=sender_data.get('senderName', customer_name),
            contact_phone=sender_data.get('senderPhone', customer_phone),
            pickup_instructions=s_addr.get('notes', '')
        )
        db.session.add(pickup_point)
        db.session.flush()
        
        # 3. כתובת מסירה (Recipient Address)
        r_addr = recipient_data.get('recipientAddress', {})
        delivery_address_obj = Address(
            street=r_addr.get('street', 'Unknown'),
            city=r_addr.get('city', 'Unknown'),
            building_number=r_addr.get('number', '0'),
            floor=r_addr.get('floor'),
            apartment=r_addr.get('apartment'),
            entrance=r_addr.get('entrance'),
            latitude=r_addr.get('lat'),
            longitude=r_addr.get('lon'),
            notes=r_addr.get('notes')
        )
        db.session.add(delivery_address_obj)
        db.session.flush()
        
        delivery_point = DeliveryPoint(
            address_id=delivery_address_obj.id,
            recipient_name=recipient_data.get('recipientName', 'Unknown'),
            recipient_phone=recipient_data.get('recipientPhone', 'Unknown'),
            delivery_instructions=r_addr.get('notes', '')
        )
        db.session.add(delivery_point)
        db.session.flush()
        
        # 4. נתוני חבילה ושירות
        package_size = package_data.get('packageSize', 'small')
        package_content = package_data.get('packageContent', '')
        package_weight = float(package_data.get('packageWeight', 0))
        
        service_type = service_data.get('serviceType', 'regular')
        
        # Mapping Service Type to Priority
        priority_map = {
            'regular': 'normal',
            'express': 'high',
            'same_day': 'urgent'
        }
        priority = priority_map.get(service_type, 'normal')

        # 5. חישוב מחיר
        # TODO: Calculate real distance using OSRM/Google between addresses
        # For prototype: Random or fixed distance if not provided
        distance_km = data.get('distance_km', 10.0) 
        
        # Map fields to PricingEngine expectations
        delivery_type = service_data.get('deliveryType', 'standard')
        urgency = service_data.get('urgency', 'standard')
        # Legacy mapping if needed
        if service_type == 'express': urgency = 'express'
        if service_type == 'same_day': urgency = 'same_day'
        
        insurance_value = float(service_data.get('insuranceValue', 0)) if service_data.get('insuranceRequired') else 0

        calculation = PricingEngine.calculate_price(
            distance_km=distance_km,
            package_size=package_size,
            urgency=urgency,
            delivery_type=delivery_type,
            insurance_value=insurance_value,
            weight_kg=package_weight
        )
        
        price = calculation['final_price']
        
        # 6. יצירת ההזמנה
        order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        # Handle 'envelope' mapping for DB enum
        db_package_size = 'small' if package_size == 'envelope' else package_size

        delivery = Delivery(
            order_number=order_number,
            customer_id=customer.id,
            pickup_point_id=pickup_point.id,
            delivery_point_id=delivery_point.id,
            status='pending',
            priority=priority,
            package_description=package_content,
            package_weight=package_weight,
            package_size=db_package_size,
            distance_km=distance_km,
            notes=f"Service: {service_type}. Content: {package_content}",
            # Logistics Fields
            delivery_type=service_data.get('deliveryType', 'standard'),
            urgency=service_data.get('urgency', 'standard'),
            insurance_required=service_data.get('insuranceRequired', False),
            insurance_value=service_data.get('insuranceValue', 0.00),
            
            # Security
            biometric_verification_required=(
                service_data.get('deliveryType') in ['legal_document', 'valuable'] or 
                service_data.get('insuranceRequired') is True
            ),
            
            estimated_pickup_time=datetime.now() + timedelta(hours=1)
        )
        db.session.add(delivery)
        db.session.flush()
        
        # 7. יצירת חשבונית
        vat_amount = price * 0.17
        total_amount = price + vat_amount
        
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        payment_method_data = data.get('payment', {}).get('paymentMethod', 'credit_card')
        
        invoice = Invoice(
            invoice_number=invoice_number,
            customer_id=customer.id,
            delivery_id=delivery.id,
            subtotal=price,
            vat_amount=vat_amount,
            total_amount=total_amount,
            status='draft',
            payment_method=payment_method_data
        )
        db.session.add(invoice)
        db.session.commit()
        
        # 8. Notify Admin
        from extensions import socketio
        if socketio:
            socketio.emit('new_order', {
                'id': delivery.id, 
                'order_number': order_number,
                'status': 'pending',
                'customer': customer_name
            }, room='admin')

        # 9. Automatic Allocation (Algorithm)
        from utils.allocation_engine import AllocationEngine
        logging.info(f"Starting auto-allocation for {order_number}...")
        
        best_courier = AllocationEngine.find_best_courier(delivery)
        
        if best_courier:
            delivery.courier_id = best_courier.id
            delivery.status = 'assigned' # Or 'offered' if we want acceptance flow
            delivery.updated_at = datetime.utcnow()
            db.session.commit()
            
            logging.info(f"Auto-assigned {order_number} to {best_courier.full_name}")
            
            # Notify Courier
            if socketio:
                try:
                    socketio.emit('new_assignment', {
                        'order_id': delivery.id,
                        'order_number': order_number,
                        'pickup_address': delivery.pickup_point.address.street,
                        'delivery_address': delivery.delivery_point.address.street,
                        'package_size': delivery.package_size,
                        'notes': delivery.notes
                    }, room=f"courier_{best_courier.id}")
                except Exception as e:
                    logging.warning(f"Socket error notify courier: {e}")
                    
            # Notify Admin of Update
            if socketio:
                socketio.emit('order_update', {
                    'id': delivery.id,
                    'status': 'assigned',
                    'courier_name': best_courier.full_name
                }, room='admin')
        
        # AUDIT LOG
        from utils.audit import log_audit
        log_audit(
            action='CREATE_ORDER',
            user_id=current_user.id,
            resource_type='Delivery',
            resource_id=delivery.id,
            details=f"Order {order_number} created with price {total_amount}",
            status='SUCCESS'
        )

        return jsonify({
            'success': True,
            'id': delivery.id,
            'order_number': order_number,
            'price': total_amount,
            'invoice_number': invoice_number,
            'assigned_courier': best_courier.full_name if best_courier else None
        }), 201
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        logging.error(f"Error creating order: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/calculate', methods=['POST'])
@token_required
def calculate_quote(current_user):
    """Endpoint to get price quote before creating order"""
    try:
        data = request.json
        
        distance_km = data.get('distance_km', 10.0) # In future, calculate from addresses here
        
        quote = PricingEngine.calculate_price(
            distance_km=distance_km,
            package_size=data.get('package_size', 'small'),
            urgency=data.get('urgency', 'standard'),
            delivery_type=data.get('delivery_type', 'standard'),
            insurance_value=float(data.get('insurance_value', 0)),
            weight_kg=float(data.get('weight', 0))
        )
        
        return jsonify({
            'success': True,
            'price': quote['final_price'],
            'breakdown': quote['breakdown'],
            'currency': 'ILS'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400



@orders_bp.route('', methods=['GET'])
@token_required
@role_required(['admin', 'courier', 'customer']) 
def get_orders(current_user):
    """קבלת כל ההזמנות"""
    try:
        query = Delivery.query

        # Filter based on user role
        if current_user.user_type == 'customer':
            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if not customer:
                return jsonify([]), 200 # No customer profile yet
            query = query.filter_by(customer_id=customer.id)
            
        elif current_user.user_type == 'courier':
             courier = Courier.query.filter_by(user_id=current_user.id).first()
             if not courier:
                 return jsonify([]), 200
             query = query.filter_by(courier_id=courier.id)
        
        # Admin sees all (no filter added)
        
        deliveries = query.order_by(Delivery.created_at.desc()).all()
        
        result = []
        for d in deliveries:
            result.append({
                'id': d.id,
                'order_number': d.order_number,
                'customer_name': d.customer.full_name if d.customer else 'לא ידוע',
                'phone': d.customer.user.phone if d.customer and d.customer.user else '',
                'address': d.delivery_point.address.street if d.delivery_point else '',
                'status': d.status,
                'total': float(d.invoice.total_amount) if d.invoice else 0,
                'items': d.package_description or '[]',
                'created_at': d.created_at.isoformat() if d.created_at else None,
                'pickup_address': d.pickup_point.address.street if d.pickup_point else '',
                'delivery_address': d.delivery_point.address.street if d.delivery_point else ''
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        logging.error(f"Error fetching orders: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500



@orders_bp.route('/<int:order_id>', methods=['GET'])
@token_required
def get_order(current_user, order_id):
    """קבלת הזמנה ספציפית"""
    try:
        delivery = Delivery.query.get_or_404(order_id)
        
        # AUDIT LOG - Access to sensitive data
        from utils.audit import log_audit
        log_audit(
            action='VIEW_ORDER',
            user_id=current_user.id,
            resource_type='Delivery',
            resource_id=delivery.id,
            details=f"User accessed order {delivery.order_number}"
        )
        
        return jsonify({
            'id': delivery.id,
            'order_number': delivery.order_number,
            'customer': {
                'name': delivery.customer.full_name,
                'phone': delivery.customer.user.phone
            },
            'pickup': {
                'address': delivery.pickup_point.address.street,
                'contact': delivery.pickup_point.contact_name,
                'phone': delivery.pickup_point.contact_phone,
                'coords': {
                    'lat': delivery.pickup_point.address.latitude,
                    'lon': delivery.pickup_point.address.longitude
                }
            },
            'delivery': {
                'address': delivery.delivery_point.address.street,
                'recipient': delivery.delivery_point.recipient_name,
                'phone': delivery.delivery_point.recipient_phone,
                'coords': {
                    'lat': delivery.delivery_point.address.latitude,
                    'lon': delivery.delivery_point.address.longitude
                }
            },
            'package': {
                'size': delivery.package_size,
                'description': delivery.package_description,
                'weight': delivery.package_weight
            },
            'status_history': [{
                'status': h.status,
                'timestamp': h.timestamp.isoformat(),
                'notes': h.notes
            } for h in delivery.status_history],
            'status': delivery.status,
            'distance_km': float(delivery.distance_km) if delivery.distance_km else 0,
            'price': float(delivery.invoice.total_amount) if delivery.invoice else 0,
            'notes': delivery.notes,
            'created_at': delivery.created_at.isoformat()
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching order: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 404



@orders_bp.route('/<int:order_id>/assign', methods=['POST'])
@token_required
@role_required('admin')
def assign_order(current_user, order_id):
    """הקצאת הזמנה לשליח"""
    try:
        data = request.json
        courier_id = data.get('courier_id')
        
        delivery = Delivery.query.get_or_404(order_id)
        delivery.courier_id = courier_id
        delivery.status = 'assigned'
        
        db.session.commit()
        
        # Notify the courier via Socket.IO
        from extensions import socketio
        try:
            socketio.emit('new_assignment', {
                'order_id': delivery.id,
                'order_number': delivery.order_number,
                'pickup_address': delivery.pickup_point.address.street,
                'delivery_address': delivery.delivery_point.address.street,
                'package_size': delivery.package_size
            }, room=f"courier_{courier_id}")
            logging.info(f"Sent notification to courier_{courier_id}")
        except Exception as e:
            logging.warning(f"Failed to send socket notification: {e}")
        
        
        # AUDIT LOG
        from utils.audit import log_audit
        log_audit(
            action='ASSIGN_ORDER',
            user_id=current_user.id,
            resource_type='Delivery',
            resource_id=delivery.id,
            details=f"Assigned courier {courier_id} to order {delivery.order_number}",
            status='SUCCESS'
        )

        return jsonify({
            'success': True,
            'message': 'Courier assigned successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error assigning courier: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500



@orders_bp.route('/<int:order_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_order(current_user, order_id):
    """מחיקת הזמנה"""
    try:
        delivery = Delivery.query.get_or_404(order_id)
        
        # מחק את כל הרשומות הקשורות (CASCADE ידאג לזה אוטומטית)
        db.session.delete(delivery)
        db.session.commit()
        
        # AUDIT LOG
        from utils.audit import log_audit
        log_audit(
            action='DELETE_ORDER',
            user_id=current_user.id,
            resource_type='Delivery',
            resource_id=order_id,
            details=f"Deleted order {delivery.order_number}",
            status='SUCCESS'
        )

        return jsonify({
            'success': True,
            'message': 'Order deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting order: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500



@orders_bp.route('/<int:order_id>', methods=['PUT'])
@token_required
@role_required('admin')
def update_order(current_user, order_id):
    """עדכון פרטי הזמנה (למנהלים)"""
    try:
        delivery = Delivery.query.get_or_404(order_id)
        data = request.json
        
        # עדכון שדות בסיסיים
        if 'notes' in data:
            delivery.notes = data['notes']
        if 'package_description' in data:
            delivery.package_description = data['package_description']
        if 'priority' in data:
            delivery.priority = data['priority']
        if 'package_size' in data:
            delivery.package_size = data['package_size']
            
        # עדכון שדות מתקדמים (כתובות) - אופציונלי להמשך
        # כאן רק עדכנו את השדות הפשוטים שקל לערוך
            
        db.session.commit()
        
        db.session.commit()
        
        # AUDIT LOG
        from utils.audit import log_audit
        log_audit(
            action='UPDATE_ORDER',
            user_id=current_user.id,
            resource_type='Delivery',
            resource_id=delivery.id,
            details=f"Updated order details",
            status='SUCCESS'
        )

        return jsonify({
            'success': True,
            'message': 'Order updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating order: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500