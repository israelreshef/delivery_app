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

from models import db, Courier, User, Delivery, ShiftSession, CourierGamification, DailyMission
from werkzeug.security import generate_password_hash
from utils.decorators import token_required, role_required
from sqlalchemy.orm import joinedload
import logging

couriers_bp = Blueprint('couriers', __name__)

@couriers_bp.route('/upload', methods=['POST'])
@token_required
@role_required('courier')
def upload_file(current_user):
    """העלאת קובץ (חתימה/מסמך)"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        filename = f"{uuid.uuid4().hex}_{file.filename}"
        upload_dir = Path(__file__).parent.parent / 'uploads' / 'pod'
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = upload_dir / filename
        file.save(file_path)
        
        # Return the path that can be saved in the database
        return jsonify({'url': f"/uploads/pod/{filename}"}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@couriers_bp.route('/documents', methods=['GET'])
@token_required
@role_required(['courier', 'admin'])
def get_documents(current_user):
    """Get courier's uploaded documents"""
    try:
        from models import CourierDocument, Courier

        # Admin can query any courier's docs, courier sees their own
        courier_id = request.args.get('courier_id', type=int)

        if current_user.user_type == 'courier':
            courier = Courier.query.filter_by(user_id=current_user.id).first()
            if not courier:
                return jsonify({'error': 'Courier profile not found'}), 404
            courier_id = courier.id
        elif not courier_id:
            return jsonify({'error': 'courier_id is required for admin'}), 400

        docs = CourierDocument.query.filter_by(courier_id=courier_id).order_by(
            CourierDocument.uploaded_at.desc()
        ).all()

        return jsonify([{
            'id': d.id,
            'document_type': d.document_type,
            'file_path': d.file_path,
            'status': d.status,
            'expiry_date': d.expiry_date.isoformat() if d.expiry_date else None,
            'uploaded_at': d.uploaded_at.isoformat() if d.uploaded_at else None,
            'reviewed_at': d.reviewed_at.isoformat() if d.reviewed_at else None
        } for d in docs]), 200

    except Exception as e:
        logging.error(f"Error fetching documents: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('', methods=['GET'])
@token_required
@role_required('admin')
def get_couriers(current_user):
    """קבלת כל השליחים (עם פגינציה)"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('limit', 50, type=int)
        
        query = Courier.query.options(joinedload(Courier.user))
        paginated_data = query.paginate(page=page, per_page=per_page, error_out=False)
        couriers = paginated_data.items
        
        result = []
        for c in couriers:
            # Safely handle enum and objects
            vehicle_type_str = str(c.vehicle_type) if c.vehicle_type else 'scooter'
            if '.' in vehicle_type_str:
                vehicle_type_str = vehicle_type_str.split('.')[-1]

            result.append({
                'id': c.id,
                'full_name': c.full_name,
                'phone': c.user.phone if c.user else '',
                'vehicle_type': vehicle_type_str,
                'is_available': c.is_available,
                'onboarding_status': str(c.onboarding_status.value) if hasattr(c.onboarding_status, 'value') else str(c.onboarding_status),
                'rating': float(c.rating) if c.rating else 5.0,
                'total_deliveries': c.total_deliveries,
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

@couriers_bp.route('/<int:courier_id>', methods=['GET', 'PUT'])
@token_required
@role_required(['admin', 'courier'])
def handle_courier(current_user, courier_id):
    """Get Courier details (GET) or Update Courier details (PUT)"""
        
    if request.method == 'GET':
        try:
            courier = Courier.query.get_or_404(courier_id)
            return jsonify({
                'id': courier.id, 'full_name': courier.full_name, 'is_available': courier.is_available,
                'rating': float(courier.rating), 'vehicle_type': courier.vehicle_type
            }), 200
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
            
    elif request.method == 'PUT':
        if current_user.user_type != 'admin' and getattr(current_user, 'admin_role', None) != 'super_admin':
            return jsonify({'error': 'Unauthorized - admin only'}), 403
            
        try:
            courier = Courier.query.get_or_404(courier_id)
            data = request.get_json()
            
            # Admin can update courier fields
            if 'full_name' in data:
                courier.full_name = data['full_name']
            if 'vehicle_type' in data:
                courier.vehicle_type = data['vehicle_type']
            if 'license_plate' in data:
                courier.license_plate = data['license_plate']
            if 'is_available' in data:
                courier.is_available = data['is_available']
            if 'onboarding_status' in data:
                courier.onboarding_status = data['onboarding_status']
                
            # Update associated User fields if available
            if courier.user:
                if 'phone' in data:
                    courier.user.phone = data['phone']
                if 'email' in data:
                    courier.user.email = data['email']
                    
            db.session.commit()
            return jsonify({'message': 'Courier updated successfully'}), 200
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

@couriers_bp.route('/<int:courier_id>/related', methods=['GET'])
@token_required
@role_required('admin')
def get_courier_related(current_user, courier_id):
    """קבלת מידע מלא על שליח עבור כרטיס שליח"""
    try:
        from models import Courier, Delivery, ShiftSession, CourierGamification
        
        courier = Courier.query.get_or_404(courier_id)
        
        # 1. Recent Deliveries
        deliveries = Delivery.query.filter_by(courier_id=courier_id).order_by(Delivery.created_at.desc()).limit(20).all()
        deliveries_data = [{
            'id': d.id,
            'order_number': d.order_number,
            'status': d.status,
            'amount': float(d.delivery_fee or 0),
            'timestamp': d.created_at.isoformat() if d.created_at else None,
            'pickup': f"{d.pickup_point.address.street} {d.pickup_point.address.building_number}, {d.pickup_point.address.city}" if d.pickup_point and d.pickup_point.address else "לא ידוע",
            'dropoff': f"{d.delivery_point.address.street} {d.delivery_point.address.building_number}, {d.delivery_point.address.city}" if d.delivery_point and d.delivery_point.address else "לא ידוע"
        } for d in deliveries]
        
        # 2. Gamification / Stats
        gamification = CourierGamification.query.filter_by(courier_id=courier.id).first()
        g_data = {
            'level': gamification.level if gamification else 1,
            'xp': gamification.xp if gamification else 0,
            'performance_index': courier.performance_index
        }
        
        # 3. Active Shift
        active_shift = ShiftSession.query.filter_by(courier_id=courier.id, is_active=True).first()
        shift_data = {
            'is_active': active_shift is not None,
            'vibe': active_shift.vibe_selected if active_shift else None,
            'start_time': active_shift.start_time.isoformat() if active_shift else None
        }

        # 4. Courier Details
        courier_data = {
            'id': courier.id,
            'full_name': courier.full_name,
            'vehicle_type': courier.vehicle_type,
            'license_plate': courier.license_plate,
            'phone': courier.user.phone if courier.user else '',
            'email': courier.user.email if courier.user else '',
            'rating': float(courier.rating),
            'total_deliveries': courier.total_deliveries,
            'is_available': courier.is_available,
            'onboarding_status': courier.onboarding_status,
            'created_at': courier.created_at.isoformat() if hasattr(courier, 'created_at') and courier.created_at else None
        }

        return jsonify({
            'courier': courier_data,
            'deliveries': deliveries_data,
            'gamification': g_data,
            'active_shift': shift_data,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@couriers_bp.route('/availability', methods=['PATCH'])
@token_required
@role_required('courier')
def update_availability(current_user):
    """עדכון זמינות השליח"""
    try:
        data = request.json
        is_available = data.get('is_available', False)
        
        with open('courier_debug.log', 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.utcnow().isoformat()}] PATCH /availability - User: {current_user.id}, Available: {is_available}\n")

        if 'is_available' not in data:
            return jsonify({'error': 'is_available field is required'}), 400
            
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404
            
        courier.is_available = data['is_available']
        db.session.commit()
        
        # Emit Socket.IO event for real-time dashboard updates
        from extensions import socketio
        socketio.emit('courier_availability_update', {
            'courier_id': courier.id,
            'is_available': courier.is_available
        }, namespace='/')
        
        return jsonify({'success': True, 'is_available': courier.is_available}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('/location', methods=['POST'])
@token_required
@role_required('courier')
def update_location(current_user):
    """עדכון מיקום השליח בזמן אמת"""
    try:
        data = request.json
        lat = data.get('lat') or data.get('latitude')
        lng = data.get('lng') or data.get('longitude')
        
        if lat is None or lng is None:
            return jsonify({'error': 'lat and lng are required'}), 400
            
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404
            
        courier.current_location_lat = lat
        courier.current_location_lng = lng
        db.session.commit()
        
        # Check for active delivery to broadcast to specific tracking rooms
        active_order = Delivery.query.filter(
            Delivery.courier_id == courier.id,
            Delivery.status.in_(['assigned', 'picked_up', 'in_transit'])
        ).first()

        # Determine status for frontend display
        status = 'busy' if active_order else ('idle' if courier.is_available else 'offline')
        
        # Emit Socket.IO event for real-time dashboard updates
        from extensions import socketio
        location_data = {
            'courier_id': courier.id,
            'name': courier.full_name,
            'lat': lat,
            'lng': lng,
            'status': status,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Broadcast to admin room
        print(f" 📡 Sending location fix to admin_room: Courier {courier.id} at {lat}, {lng}")
        socketio.emit('courier_location_update', location_data, room='admin_room')
        
        if active_order:
             socketio.emit('delivery_location_update', {
                 **location_data,
                 'delivery_id': active_order.id
             }, room=f'delivery_{active_order.id}')
             
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
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
             p_addr = o.pickup_point.address if o.pickup_point else None
             d_addr = o.delivery_point.address if o.delivery_point else None
             
             result.append({
                'id': o.id,
                'order_number': o.order_number,
                'pickup_address': o.pickup_address,
                'delivery_address': o.delivery_address,
                'package_description': "חבילה רגילה",
                'estimated_price': float(o.price) if o.price else 30.0,
                'pickup_lat': p_addr.latitude if p_addr else None,
                'pickup_lng': p_addr.longitude if p_addr else None,
                'delivery_lat': d_addr.latitude if d_addr else None,
                'delivery_lng': d_addr.longitude if d_addr else None
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
            Delivery.status.in_(['assigned', 'picked_up', 'in_transit'])
        ).first()

        if not order:
            return jsonify({}), 200
            
        return jsonify({
            'id': order.id,
            'order_number': order.order_number,
            'status': order.status,
            'pickup_address': f"{order.pickup_point.address.street} {order.pickup_point.address.building_number}, {order.pickup_point.address.city}" if order.pickup_point and order.pickup_point.address else "כתובת איסוף חסרה",
            'delivery_address': f"{order.delivery_point.address.street} {order.delivery_point.address.building_number}, {order.delivery_point.address.city}" if order.delivery_point and order.delivery_point.address else "כתובת מסירה חסרה",
            'recipient_phone': order.delivery_point.recipient_phone if order.delivery_point else "050-0000000",
            'package_description': order.package_description or "לא צוין פירוט",
            'price': float(order.delivery_fee) if order.delivery_fee else 0.0
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
        today_earnings_query = db.session.query(func.sum(Delivery.delivery_fee)).filter(
            Delivery.courier_id == courier.id,
            Delivery.status == 'delivered',
            Delivery.updated_at >= today_start
        ).scalar()
        
        today_earnings = float(today_earnings_query or 0)
        
        # Calculate weekly earnings
        week_ago = datetime.utcnow() - timedelta(days=7)
        weekly_earnings_query = db.session.query(func.sum(Delivery.delivery_fee)).filter(
            Delivery.courier_id == courier.id,
            Delivery.status == 'delivered',
            Delivery.updated_at >= week_ago
        ).scalar()
        
        weekly_earnings = float(weekly_earnings_query or 0)
        
        from services.gamification import GamificationService
        rank_badge = GamificationService.get_rank_badge(courier.performance_index)

        return jsonify({
            'totalDeliveries': courier.total_deliveries,
            'todayEarnings': today_earnings,
            'weeklyEarnings': weekly_earnings,
            'rating': float(courier.rating or 5.0),
            'performanceIndex': courier.performance_index,
            'rankBadge': rank_badge,
            'balance': 0.0 # Placeholder for now, could be integrated with finance
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
        total_earnings = 0
        for d in deliveries:
            earning = float(d.price or 0)
            total_earnings += earning
            
            # Duration calculation (if available)
            duration_mins = None
            if d.actual_pickup_time and d.actual_delivery_time:
                duration = d.actual_delivery_time - d.actual_pickup_time
                duration_mins = int(duration.total_seconds() / 60)

            result.append({
                'id': d.id,
                'order_number': d.order_number,
                'completed_at': d.updated_at.isoformat() if d.updated_at else None,
                'pickup_address': d.pickup_address,
                'dropoff_address': d.delivery_address,
                'earning': earning,
                'distance_km': d.distance_km or 0.0,
                'duration_mins': duration_mins,
                'base_fare': float(d.price or 0) * 0.8, # Mock breakdown
                'tip': float(d.price or 0) * 0.2  # Mock breakdown
            })
            
        return jsonify({
            'history': result,
            'total_earnings': total_earnings,
            'completed_count': len(result)
        }), 200
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
        delivery.status = 'assigned' # Enum matching
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
        pod_signature = data.get('pod_signature')
        pod_image = data.get('pod_image')
        
        if new_status == 'delivered':
             upload_dir = Path(__file__).parent.parent / 'uploads' / 'pod'
             upload_dir.mkdir(parents=True, exist_ok=True)

             # Handle Signature
             if pod_signature:
                 try:
                    if ',' in pod_signature: pod_signature = pod_signature.split(',')[1]
                    sig_data = base64.b64decode(pod_signature)
                    sig_filename = f"sig_{delivery.order_number}_{uuid.uuid4().hex[:6]}.png"
                    with open(upload_dir / sig_filename, 'wb') as f:
                        f.write(sig_data)
                    delivery.pod_signature_path = f"/uploads/pod/{sig_filename}"
                 except Exception as sig_err:
                    logging.error(f"Signature save error: {sig_err}")

             # Handle Photo
             if pod_image:
                 try:
                    if ',' in pod_image: pod_image = pod_image.split(',')[1]
                    img_data = base64.b64decode(pod_image)
                    img_filename = f"photo_{delivery.order_number}_{uuid.uuid4().hex[:6]}.jpg"
                    with open(upload_dir / img_filename, 'wb') as f:
                        f.write(img_data)
                    delivery.pod_image_path = f"/uploads/pod/{img_filename}"
                 except Exception as img_err:
                    logging.error(f"POD photo save error: {img_err}")
                
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
             
             # --- TZIR Academy Gamification Trigger ---
             try:
                 from services.gamification import GamificationService
                 GamificationService.process_delivery_completion(courier.id, delivery.id)
             except Exception as e:
                 logging.error(f"Gamification update failed: {e}")
        
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

@couriers_bp.route('/orders/<int:order_id>/send-otp', methods=['POST'])
@token_required
@role_required('courier')
def send_order_otp(current_user, order_id):
    """(Re)send OTP to customer via SMS or WhatsApp"""
    try:
        import random
        from services.messaging import MessagingService
        
        delivery = Delivery.query.get_or_404(order_id)
        
        # Generate 6-digit OTP
        otp = f"{random.randint(100000, 999999)}"
        delivery.otp_code = otp
        db.session.commit()
        
        # Send via unified messaging service
        recipient_phone = delivery.delivery_point.recipient_phone if delivery.delivery_point else "0500000000"
        
        messaging_result = MessagingService.send_otp(recipient_phone, otp)
        
        if messaging_result.get('success'):
            logging.info(f"OTP {otp} for Order {delivery.order_number} sent via {messaging_result.get('provider')}")
            return jsonify({
                'success': True, 
                'message': f'OTP sent successfully via {messaging_result.get("provider")}',
                'debug_otp': otp # Include for easier emulator testing
            }), 200
        else:
             logging.error(f"Failed to send OTP to {recipient_phone}: {messaging_result.get('error')}")
             return jsonify({
                'success': False, 
                'error': f"Failed to send message: {messaging_result.get('error')}",
                'debug_otp': otp # Fallback for dev even on error
             }), 500
             
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('/orders/<int:order_id>/verify-otp', methods=['POST'])
@token_required
@role_required('courier')
def verify_order_otp(current_user, order_id):
    """Verify OTP provided by customer"""
    try:
        data = request.json
        input_code = data.get('otp_code')
        
        if not input_code:
            return jsonify({'error': 'OTP code is required'}), 400
            
        delivery = Delivery.query.get_or_404(order_id)
        courier = Courier.query.filter_by(user_id=current_user.id).first()

        if delivery.courier_id != courier.id:
            return jsonify({'error': 'Unauthorized: You are not assigned to this delivery'}), 403

        if delivery.otp_code == input_code:
            delivery.otp_verified = True
            delivery.status = 'delivered'
            delivery.actual_delivery_time = datetime.utcnow()
            delivery.updated_at = datetime.utcnow()
            
            # --- Trigger Gamification & Smart Scoring Update ---
            try:
                from services.gamification import GamificationService
                GamificationService.process_delivery_completion(courier.id, delivery.id)
            except Exception as e:
                logging.error(f"Gamification update failed: {e}")
            
            # AUDIT LOG
            from utils.audit import log_audit
            log_audit(
                action='VERIFY_OTP_DELIVERED',
                user_id=current_user.id,
                resource_type='Delivery',
                resource_id=delivery.id,
                details=f"Order {delivery.order_number} verified and delivered via OTP",
                status='SUCCESS'
            )
            
            db.session.commit()
            return jsonify({'success': True, 'message': 'Delivery completed successfully'}), 200
        else:
            return jsonify({'success': False, 'error': 'Invalid OTP code'}), 400
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ============================================================================
# TZIR Academy: Gamification & Shift Management Flow
# ============================================================================

@couriers_bp.route('/shift/start', methods=['POST'])
@token_required
@role_required('courier')
def start_shift(current_user):
    """תחילת משמרת וקביעת הווייב היומי"""
    try:
        data = request.json or {}
        vibe = data.get('vibe', 'general')
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier: return jsonify({'error': 'Courier not found'}), 404

        # Close any active shifts
        active_shifts = ShiftSession.query.filter_by(courier_id=courier.id, is_active=True).all()
        for shift in active_shifts:
            shift.is_active = False
            shift.end_time = datetime.utcnow()

        new_shift = ShiftSession(
            courier_id=courier.id,
            start_time=datetime.utcnow(),
            is_active=True,
            vibe_selected=vibe
        )
        courier.is_available = True
        db.session.add(new_shift)
        
        # Initialize gamification if missing
        gamification = CourierGamification.query.filter_by(courier_id=courier.id).first()
        if not gamification:
            gamification = CourierGamification(courier_id=courier.id, level=1, xp=0)
            db.session.add(gamification)
            
        db.session.commit()
        return jsonify({'success': True, 'shift_id': new_shift.id, 'vibe': vibe}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('/shift/status', methods=['GET'])
@token_required
@role_required('courier')
def get_shift_status(current_user):
    """בדיקת סטטוס משמרת והגנת שחיקה"""
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier: return jsonify({'error': 'Courier not found'}), 404
        
        active_shift = ShiftSession.query.filter_by(courier_id=courier.id, is_active=True).first()
        if not active_shift:
            return jsonify({'is_active': False}), 200

        # Calculate duration
        duration = datetime.utcnow() - active_shift.start_time
        hours_active = duration.total_seconds() / 3600.0

        recommend_rest = False
        force_stop = False

        if hours_active >= 8.0:
            force_stop = True
            active_shift.forced_stop_applied = True
            active_shift.is_active = False
            courier.is_available = False
            active_shift.end_time = datetime.utcnow()
            db.session.commit()
        elif hours_active >= 6.0 and not active_shift.rest_recommended_shown:
            recommend_rest = True
            active_shift.rest_recommended_shown = True
            db.session.commit()

        return jsonify({
            'is_active': active_shift.is_active,
            'hours_active': round(hours_active, 2),
            'recommend_rest': recommend_rest,
            'force_stop': force_stop,
            'vibe': active_shift.vibe_selected
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@couriers_bp.route('/gamification/profile', methods=['GET'])
@token_required
@role_required('courier')
def get_gamification_profile(current_user):
    """קבלת פרופיל גיימיפיקציה"""
    try:
        from models import EarnedMilestone
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier: return jsonify({'error': 'Courier not found'}), 404
        
        gamification = CourierGamification.query.filter_by(courier_id=courier.id).first()
        if not gamification:
            gamification = CourierGamification(courier_id=courier.id, level=1, xp=0)
            db.session.add(gamification)
            db.session.commit()

        earned = EarnedMilestone.query.filter_by(courier_id=courier.id).all()
        earned_list = [{
            'id': e.milestone.id,
            'title': e.milestone.title,
            'description': e.milestone.description,
            'reward_xp': e.milestone.reward_xp,
            'earned_at': e.earned_at.isoformat()
        } for e in earned if e.milestone]

        # Get or create today's mission
        today = datetime.utcnow().date()
        mission = DailyMission.query.filter_by(courier_id=courier.id, mission_date=today).first()
        if not mission:
            mission = DailyMission(courier_id=courier.id, mission_date=today)
            db.session.add(mission)
            db.session.commit()

        return jsonify({
            'level': gamification.level,
            'xp': gamification.xp,
            'next_level_xp': gamification.level * 1000,
            'daily_mission': {
                'completed_deliveries': mission.completed_deliveries,
                'target_deliveries': 10,
                'fast_deliveries': mission.fast_deliveries,
                'streak_days': mission.streak_days
            },
            'earned_milestones': earned_list
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
