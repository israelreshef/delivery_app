from flask import Blueprint, request, jsonify
import uuid
import sys
import os
import base64
from pathlib import Path
from datetime import datetime, timedelta
from sqlalchemy import func

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import db, Courier, User, Delivery
from werkzeug.security import generate_password_hash
from utils.decorators import token_required, role_required
import logging

couriers_bp = Blueprint('couriers', __name__)

@couriers_bp.route('', methods=['GET'])
@token_required
@role_required('admin')
def get_couriers(current_user):
    """קבלת כל השליחים (עם פגינציה)"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('limit', 50, type=int)
        
        paginated_data = Courier.query.paginate(page=page, per_page=per_page, error_out=False)
        couriers = paginated_data.items
        
        result = []
        for c in couriers:
            result.append({
                'id': c.id,
                'full_name': c.full_name,
                'phone': c.user.phone if c.user else '',
                'vehicle_type': c.vehicle_type,
                'license_plate': c.license_plate,
                'is_available': c.is_available,
                'rating': float(c.rating) if c.rating else 5.0,
                'total_deliveries': c.total_deliveries,
                'onboarding_status': c.onboarding_status,
                'current_location': {'lat': c.current_location_lat, 'lng': c.current_location_lng} if c.current_location_lat else None 
            })
            
        return jsonify({
            'data': result,
            'total': paginated_data.total,
            'pages': paginated_data.pages,
            'current_page': page
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('', methods=['POST'])
@token_required
@role_required('admin')
def create_courier(current_user):
    """יצירת שליח חדש"""
    try:
        data = request.json
        existing_user = User.query.filter_by(username=data['username']).first()
        if existing_user: return jsonify({'error': 'Username already exists'}), 400
        
        user = User(username=data['username'], email=data.get('email'), phone=data['phone'], user_type='courier')
        user.set_password(data.get('password', '123456'))
        db.session.add(user)
        db.session.flush()
        
        courier = Courier(
            user_id=user.id, full_name=data['full_name'], vehicle_type=data.get('vehicle_type', 'scooter'),
            license_plate=data.get('license_plate'), max_capacity=data.get('max_capacity', 10),
            is_available=True, rating=5.0
        )
        db.session.add(courier)
        db.session.commit()
        return jsonify({'success': True, 'id': courier.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('/<int:courier_id>', methods=['GET'])
@token_required
@role_required(['admin', 'courier'])
def get_courier(current_user, courier_id):
    try:
        courier = Courier.query.get_or_404(courier_id)
        return jsonify({
            'id': courier.id, 'full_name': courier.full_name, 'is_available': courier.is_available,
            'rating': float(courier.rating), 'vehicle_type': courier.vehicle_type
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- תוספות עבור אפליקציית השליח (שבוע 2 + 3 + 4) ---

@couriers_bp.route('/available-orders', methods=['GET'])
@token_required
@role_required('courier')
def get_available_orders(current_user):
    """קבלת משלוחים זמינים"""
    try:
        # In a real app, strict geo-fencing would apply here
        orders = Delivery.query.filter_by(status='pending', courier_id=None).all()
        result = []
        for o in orders:
             result.append({
                'id': o.id,
                'order_number': o.order_number,
                'pickup_address': o.pickup_address,
                'delivery_address': o.delivery_address,
                'package_description': "חבילה רגילה", # Placeholder
                'estimated_price': o.price or 30.0
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('/active-order', methods=['GET'])
@token_required
@role_required('courier')
def get_active_order(current_user):
    """קבלת משלוח פעיל"""
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
             return jsonify({}), 200
             
        # Look for orders in progress
        order = Delivery.query.filter(
            Delivery.courier_id == courier.id,
            Delivery.status.in_(['accepted', 'assigned', 'picked_up', 'in_transit', 'arrived'])
        ).first()

        if not order:
            return jsonify({}), 200
            
        return jsonify({
            'id': order.id,
            'order_number': order.order_number,
            'status': order.status,
            'pickup_address': order.pickup_address,
            'delivery_address': order.delivery_address,
            'recipient_phone': getattr(order, 'recipient_phone', '050-0000000'), # Safely get if missing
            'package_description': "משלוח מהיר",
            'price': order.price
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('/stats', methods=['GET'])
@token_required
@role_required('courier')
def get_courier_stats(current_user):
    """קבלת סטטיסטיקות עבור הדשבורד"""
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier: return jsonify({'error': 'Courier not found'}), 404

        today = datetime.utcnow().date()
        today_start = datetime(today.year, today.month, today.day)
        
        today_deliveries = Delivery.query.filter(
            Delivery.courier_id == courier.id,
            Delivery.status == 'delivered',
            Delivery.updated_at >= today_start
        ).count()
        
        # Calculate earnings (mock logic if price is missing)
        today_earnings_query = db.session.query(func.sum(Delivery.price)).filter(
            Delivery.courier_id == courier.id,
            Delivery.status == 'delivered',
            Delivery.updated_at >= today_start
        ).scalar()
        
        today_earnings = float(today_earnings_query or 0)
        
        return jsonify({
            'today_deliveries': today_deliveries,
            'today_earnings': today_earnings,
            'avg_rating': float(courier.rating or 5.0),
            'completion_rate': 98 # Hardcoded for now
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('/history', methods=['GET'])
@token_required
@role_required('courier')
def get_courier_history(current_user):
    """קבלת היסטוריית משלוחים"""
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier: return jsonify({'error': 'Courier not found'}), 404
        
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        deliveries = Delivery.query.filter(
            Delivery.courier_id == courier.id,
            Delivery.status == 'delivered',
            Delivery.updated_at >= start_date
        ).order_by(Delivery.updated_at.desc()).limit(50).all()
        
        result = []
        for d in deliveries:
            result.append({
                'id': d.id,
                'order_number': d.order_number,
                'date': d.updated_at.isoformat() if d.updated_at else None,
                'pickup_address': d.pickup_address,
                'delivery_address': d.delivery_address,
                'price': d.price or 0
            })
            
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('/orders/<int:order_id>/accept', methods=['POST'])
@token_required
@role_required('courier')
def accept_order(current_user, order_id):
    """קבלת משלוח ע"י שליח"""
    try:
        from app import socketio # Import here to avoid circular
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier: return jsonify({'error': 'Courier profile not found'}), 404
            
        delivery = Delivery.query.get_or_404(order_id)
        
        if delivery.status != 'assigned' and delivery.status != 'pending':
             return jsonify({'error': 'Order not available'}), 400
        
        delivery.courier_id = courier.id
        delivery.status = 'accepted'
        delivery.updated_at = datetime.utcnow()
        db.session.commit()
        
        if socketio:
            socketio.emit('order_update', {'id': delivery.id, 'status': 'accepted', 'courier_name': courier.full_name}, room='admin_room')
            # Notify courier specifically
            socketio.emit('delivery_status_update', {'delivery_id': delivery.id, 'status': 'accepted', 'courier_id': courier.id}, room=f'courier_{courier.id}')

        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('/orders/<int:order_id>/reject', methods=['POST'])
@token_required
@role_required('courier')
def reject_order(current_user, order_id):
    """דחיית משלוח"""
    try:
        from app import socketio
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        delivery = Delivery.query.get_or_404(order_id)
        
        if delivery.courier_id != courier.id: return jsonify({'error': 'Not assigned to you'}), 400

        delivery.courier_id = None
        delivery.status = 'pending'
        db.session.commit()
        
        if socketio:
             socketio.emit('order_update', {'id': delivery.id, 'status': 'pending', 'alert': f'Rejected by {courier.full_name}'}, room='admin_room')
             socketio.emit('new_order_offer', {'order': {'id': delivery.id, 'pickup_address': delivery.pickup_address, 'delivery_address': delivery.delivery_address}}, room='courier_room')

        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('/orders/<int:order_id>/status', methods=['POST'])
@token_required
@role_required('courier')
def update_delivery_status(current_user, order_id):
    """עדכון סטטוס"""
    try:
        from app import socketio
        data = request.json
        new_status = data.get('status')
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        
        delivery = Delivery.query.get_or_404(order_id)
        
        # Update Status
        delivery.status = new_status
        delivery.updated_at = datetime.utcnow()
        
        # Handle POD (Proof of Delivery)
        pod_image = data.get('pod_image')
        if new_status == 'delivered' and pod_image:
             try:
                # Remove header if present (data:image/png;base64,...)
                if ',' in pod_image:
                    pod_image = pod_image.split(',')[1]
                
                img_data = base64.b64decode(pod_image)
                filename = f"pod_{delivery.order_number}_{uuid.uuid4().hex[:6]}.jpg"
                
                # Ensure directory exists
                upload_dir = Path(__file__).parent.parent / 'uploads' / 'pod'
                upload_dir.mkdir(parents=True, exist_ok=True)
                
                with open(upload_dir / filename, 'wb') as f:
                    f.write(img_data)
                
                delivery.pod_signature_path = f"/uploads/pod/{filename}" 
             except Exception as img_err:
                logging.error(f"POD save error: {img_err}")
                
        # Legal Delivery Fields (Recipient ID/Name)
        if new_status == 'delivered':
             if data.get('pod_recipient_id'):
                 delivery.pod_recipient_id = data.get('pod_recipient_id')
             
             # Create Digital Signature (Legal Requirement)
             from utils.digital_signature import DigitalSignature
             delivery_hash = DigitalSignature.sign_delivery_completion(
                 delivery_id=delivery.id,
                 courier_id=current_user.id,
                 timestamp=datetime.utcnow(),
                 recipient_id=delivery.pod_recipient_id if hasattr(delivery, 'pod_recipient_id') else None,
                 pod_path=delivery.pod_signature_path if hasattr(delivery, 'pod_signature_path') else None
             )
             
             # TODO: Store delivery_hash in DB if column exists. 
             # For now, it is logged in the immutable Audit Log below.
             
             # AUDIT LOG (Immutable Record)
             from utils.audit import log_audit
             log_audit(
                action='DELIVERY_COMPLETED_SIGNED',
                user_id=current_user.id,
                resource_type='Delivery',
                resource_id=delivery.id,
                details=f"Delivery completed. Recipient ID: {delivery.pod_recipient_id}. Digital Hash: {delivery_hash}",
                status='SUCCESS'
             )
        
        db.session.commit()
        
        if socketio:
            socketio.emit('order_update', {'id': delivery.id, 'status': new_status}, room='admin_room')
            socketio.emit('delivery_status_update', {'delivery_id': delivery.id, 'status': new_status}, room=f'courier_{courier.id}')
            if delivery.customer_id:
                socketio.emit('order_status_changed', {'order_id': delivery.id, 'status': new_status}, room=f'customer_{delivery.customer_id}')
            
        return jsonify({'success': True, 'status': new_status}), 200
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500