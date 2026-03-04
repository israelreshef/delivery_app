from flask_socketio import emit, join_room, leave_room
from flask import request
from datetime import datetime

# Import from parent directory
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

def register_socket_events(socketio):
    """רישום כל אירועי Socket.IO"""
    
    @socketio.on('connect')
    def handle_connect():
        """התחברות של קליינט - נדרש אימות"""
        print(f'⏳ Client connecting: {request.sid}')
        
        # 1. Get Token from Query Params or Headers
        token = request.args.get('token')
        
        # 2. Validate Token
        if not token:
             print(f'❌ Connection Rejected: No token provided (SID: {request.sid}).')
             return False # Drop connection immediately
             
        try:
            from flask_jwt_extended import decode_token
            decoded = decode_token(token)
            user_id = decoded['sub']
            print(f'✅ Client authenticated: User {user_id} (SID: {request.sid})')
            emit('connected', {'message': 'Connected to server', 'user_id': user_id})
            return True
        except Exception as e:
            print(f'❌ Connection Rejected: Invalid Token - {e} (SID: {request.sid})')
            return False

    @socketio.on('disconnect')
    def handle_disconnect():
        """ניתוק של קליינט"""
        print(f'❌ Client disconnected: {request.sid}')
    
    @socketio.on('join')
    def handle_join(data):
        """הצטרפות לחדר (admin/courier/customer)"""
        from flask_jwt_extended import decode_token
        from models import User, Courier
        
        role = data.get('role', 'guest')
        room = f"{role}_room"
        
        # Get token from socket auth or data
        token = None
        if hasattr(request, 'args') and 'token' in request.args:
            token = request.args.get('token')
        elif 'token' in data:
            token = data.get('token')
        
        # For courier role, validate authentication
        if role == 'courier':
            user_id = data.get('id') or data.get('courier_id') or data.get('user_id')
            
            if not token:
                emit('error', {'message': 'Authentication required for courier rooms'})
                print(f'❌ Courier join rejected: No token provided')
                return
            
            try:
                # Decode and validate JWT token
                decoded = decode_token(token)
                authenticated_user_id = decoded['sub']
                
                # Get the authenticated user and their courier record
                user = User.query.get(authenticated_user_id)
                if not user or user.user_type != 'courier':
                    emit('error', {'message': 'Invalid user type'})
                    print(f'❌ Courier join rejected: User is not a courier')
                    return
                
                courier = Courier.query.filter_by(user_id=user.id).first()
                if not courier:
                    emit('error', {'message': 'Courier record not found'})
                    print(f'❌ Courier join rejected: No courier record')
                    return
                
                # Verify the courier_id matches the authenticated user's courier
                if user_id and int(user_id) != courier.id:
                    emit('error', {'message': 'Unauthorized: Cannot join another courier\'s room'})
                    print(f'❌ Courier join rejected: User {user.id} tried to join courier_{user_id} but owns courier_{courier.id}')
                    return
                
                # Join the general courier room
                join_room(room)
                
                # Join the specific courier room with validated ID
                id_room = f"courier_{courier.id}"
                join_room(id_room)
                print(f'✅ Courier {courier.id} (User {user.id}) joined room: {id_room}')
                emit('joined', {'room': id_room, 'message': f'Joined courier room {courier.id}'})
                
            except Exception as e:
                emit('error', {'message': f'Authentication failed: {str(e)}'})
                print(f'❌ Courier join rejected: {str(e)}')
                return
        else:
            # For non-courier roles (admin, customer), allow joining without strict validation
            # (You may want to add similar validation for these roles in production)
            join_room(room)
            
            # Join specific ID room (e.g. customer_10, admin_5)
            user_id = data.get('id') or data.get('courier_id') or data.get('customer_id') or data.get('user_id')
            if user_id:
                id_room = f"{role}_{user_id}"
                join_room(id_room)
                print(f'👤 User joined specific room: {id_room}')
            
            print(f'👤 User joined room: {room} (SID: {request.sid})')
            emit('joined', {'room': room, 'message': f'Joined {role} room'})
    
    @socketio.on('leave')
    def handle_leave(data):
        """עזיבת חדר"""
        role = data.get('role', 'guest')
        room = f"{role}_room"
        leave_room(room)
        print(f'👋 User left room: {room} (SID: {request.sid})')
        emit('left', {'room': room, 'message': f'Left {role} room'})
    
    @socketio.on('new_order_notification')
    def handle_new_order(data):
        """הודעה על הזמנה חדשה"""
        order_id = data.get('order_id')
        print(f'📦 New order notification: {order_id}')
        
        # שלח לכל המנהלים
        emit('new_order', data, room='admin_room')
        
        # שלח לכל השליחים הזמינים
        emit('new_order_offer', data, room='courier_room')
    
    @socketio.on('order_status_update')
    def handle_status_update(data):
        """עדכון סטטוס הזמנה"""
        order_id = data.get('order_id')
        new_status = data.get('status')
        courier_id = data.get('courier_id')
        print(f'📊 Order {order_id} status updated to: {new_status}')
        
        # שלח למנהלים
        emit('order_updated', data, room='admin_room')
        
        # שלח ללקוח הספציפי (אם מחובר)
        customer_id = data.get('customer_id')
        if customer_id:
            emit('order_status_changed', data, room=f'customer_{customer_id}')
            
        # שלח לשליח הרלוונטי
        if courier_id:
             emit('delivery_status_update', data, room=f'courier_{courier_id}')
    
    @socketio.on('courier_location_update')
    def handle_location_update(data):
        """עדכון מיקום שליח"""
        courier_id = data.get('courier_id')
        # Support both lat/lng (client) and latitude/longitude (legacy)
        lat = data.get('lat') or data.get('latitude')
        lng = data.get('lng') or data.get('longitude')
        timestamp = data.get('timestamp', datetime.utcnow().isoformat())
        
        if not lat or not lng:
            return
            
        print(f'📍 Courier {courier_id} location update: {lat}, {lng}')
        
        # Prepare broadcast data
        location_data = {
            'courier_id': courier_id,
            'lat': lat,
            'lng': lng,
            'timestamp': timestamp,
            'delivery_id': data.get('delivery_id')
        }
        
        # 1. Send to Admins (Monitoring)
        emit('courier_location_update', location_data, room='admin_room')
        
        # 2. Update specific delivery tracking users
        # Clients (Customer/Admin) looking at a specific delivery should join room 'delivery_<id>'
        delivery_id = data.get('delivery_id')
        if delivery_id:
            emit('delivery_location_update', location_data, room=f'delivery_{delivery_id}')
            
        # 3. Also update the specific customer if known
        # (This relies on the client sending customer_id, or us looking it up - skipping lookup for speed)
        customer_id = data.get('customer_id')
        if customer_id:
             emit('courier_location', location_data, room=f'customer_{customer_id}')
    
    @socketio.on('message')
    def handle_message(data):
        """הודעות כלליות"""
        print(f'💬 Message received: {data}')
        emit('message_response', {'received': True, 'data': data})
    
    @socketio.on('ping')
    def handle_ping():
        """בדיקת חיבור"""
        emit('pong', {'timestamp': datetime.now().isoformat()})
    
    # פונקציות עזר לשליחת התראות
    def notify_new_order(order_data):
        """שלח התראה על הזמנה חדשה"""
        socketio.emit('new_order', order_data, room='admin_room')
        socketio.emit('new_order_available', order_data, room='courier_room')
    
    def notify_order_assigned(order_data):
        """שלח התראה על הקצאת הזמנה"""
        socketio.emit('order_assigned', order_data, room='admin_room')
        courier_id = order_data.get('courier_id')
        if courier_id:
            socketio.emit('order_assigned_to_you', order_data, room=f'courier_{courier_id}')
    
    def notify_order_completed(order_data):
        """שלח התראה על השלמת הזמנה"""
        socketio.emit('order_completed', order_data, room='admin_room')
        customer_id = order_data.get('customer_id')
        if customer_id:
            socketio.emit('order_delivered', order_data, room=f'customer_{customer_id}')
    
    # צרף פונקציות עזר לאובייקט socketio
    socketio.notify_new_order = notify_new_order
    socketio.notify_order_assigned = notify_order_assigned
    socketio.notify_order_completed = notify_order_completed
    
    return socketio