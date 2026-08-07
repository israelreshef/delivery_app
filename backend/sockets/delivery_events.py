import logging
from flask_socketio import emit, join_room, leave_room
from flask import request
from datetime import datetime
from functools import wraps
import threading

logger = logging.getLogger(__name__)

# Global registry to track currently online couriers
# Key: session_id (sid), Value: courier_id
# This allows us to strictly count "Active" as "Connected + Available"
connected_couriers = {}
connected_couriers_lock = threading.Lock()

# Handshake tokens captured at connect time, keyed by socket sid.
# flask_socketio does not re-expose the connect-time `auth` on `request` for
# later events, so event handlers authenticate against this per-session store.
_socket_auth = {}
_socket_auth_lock = threading.Lock()

def socket_log(msg):
    with open('socket_debug.log', 'a', encoding='utf-8') as f:
        f.write(f"[{datetime.utcnow().isoformat()}] {msg}\n")

# Import from parent directory
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

def get_socket_user():
    """Extract authenticated user_id from the current socket session's JWT via the handshake auth."""
    from flask_jwt_extended import decode_token
    try:
        auth = request.event.get('auth') if hasattr(request, 'event') else None
        if not auth and hasattr(request, '_sock_auth'):
            auth = request._sock_auth
        token = None
        if isinstance(auth, dict):
            token = auth.get('token')
        if not token:
            with _socket_auth_lock:
                token = _socket_auth.get(getattr(request, 'sid', None))
        if not token:
            token = request.args.get('token')
        if token:
            decoded = decode_token(token)
            return decoded['sub']
    except Exception:
        return None
    return None

def socket_auth_required(allowed_roles=None, self_check_field=None):
    """Decorator for socket event handlers.

    - allowed_roles: set of user_type values permitted (e.g. {'courier', 'admin'})
    - self_check_field: if set, verify that the event data's field matches JWT's sub
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            from models import User
            user_id = get_socket_user()
            if user_id is None:
                emit('error', {'message': 'Authentication required'})
                return

            user = User.query.get(user_id)
            if not user:
                emit('error', {'message': 'User not found'})
                return

            if allowed_roles and user.user_type not in allowed_roles:
                emit('error', {'message': 'Insufficient permissions'})
                return

            if self_check_field and args:
                data = args[0] if isinstance(args[0], dict) else {}
                claimed_id = data.get(self_check_field)
                if claimed_id is not None and str(claimed_id) != str(user_id):
                    emit('error', {'message': 'Identity mismatch'})
                    return

            return f(*args, **kwargs)
        return wrapper
    return decorator

def register_socket_events(socketio):
    """רישום כל אירועי Socket.IO"""
    
    @socketio.on('connect')
    def handle_connect(auth=None):
        """התחברות של קליינט - אימות מחמיר עם טוקן בתוקף בלבד.

        Strict token validation on every connection attempt — expired tokens
        are **rejected** here. The mobile `SocketManager` is responsible for
        refreshing the access token via `/api/auth/refresh` **before** any
        Socket.IO reconnect attempt, ensuring the handshake always carries a
        valid (non-expired) JWT.

        This enforces a zero-compromise security boundary: the server never
        relaxes its gate for expired credentials.
        """
        socket_log(f'⏳ Client connecting: {request.sid}')

        # 1. Extract token from auth object (primary) or Authorization header (fallback).
        #    Query string is NOT checked — token must never appear in a URL.
        token = None
        if auth and isinstance(auth, dict) and 'token' in auth:
            token = auth.get('token')

        if not token:
             auth_header = request.headers.get('Authorization')
             if auth_header and auth_header.startswith('Bearer '):
                 token = auth_header.split(' ')[1]

        if not token:
            logger.warning('Connection Rejected: No token (SID: %s)', request.sid)
            return False

        # 2. Strict validation — must be a well-signed, non-expired token.
        try:
            from flask_jwt_extended import decode_token
            decoded = decode_token(token)
            user_id = decoded['sub']
            with _socket_auth_lock:
                _socket_auth[request.sid] = token
            socket_log(f' Transport accepted: User {user_id} (SID: {request.sid})')
            emit('connected', {'message': 'Connected to server', 'user_id': user_id})
            return True
        except Exception as e:
            socket_log(f' ❌ Connection Rejected: Invalid or expired token - {e} (SID: {request.sid})')
            return False

    @socketio.on('disconnect')
    def handle_disconnect():
        """ניתוק של קליינט"""
        sid = request.sid
        logger.info(f' Client disconnected: {sid}')

        with _socket_auth_lock:
            _socket_auth.pop(sid, None)

        with connected_couriers_lock:
            if sid in connected_couriers:
                courier_id = connected_couriers.pop(sid)
                logger.info(f' 🛑 Courier {courier_id} went offline (Socket disconnected)')
                # Notify dashboard to refresh count
                emit('courier_count_update', {
                    'courier_id': courier_id,
                    'is_online': False
                }, room='admin_room')
    
    @socketio.on('join')
    def handle_join(data):
        """הצטרפות לחדר — השרת קובע את החדר מה-JWT, לא מהלקוח.

        The server decodes the JWT, looks up the user from the database, and
        assigns rooms based on the *server-verified* user_type and id.
        Any `role` / `id` / `courier_id` / `customer_id` values sent by the
        client are IGNORED — this prevents room spoofing.
        """
        from flask_jwt_extended import decode_token
        from models import User, Courier

        # Extract token from the event payload only.
        # Query string is NOT checked — token must never appear in a URL.
        token = data.get('token')

        if not token:
            emit('error', {'message': 'Authentication required'})
            socket_log(f' Join rejected: No token provided (SID: {request.sid})')
            return

        try:
            decoded = decode_token(token)
            authenticated_user_id = decoded['sub']

            user = User.query.get(authenticated_user_id)
            if not user:
                emit('error', {'message': 'User not found'})
                socket_log(f' Join rejected: User {authenticated_user_id} not found')
                return

            role = user.user_type  # Server-authoritative — ignore client's 'role'
            room = f"{role}_room"
            join_room(room)

            if role == 'courier':
                courier = Courier.query.filter_by(user_id=user.id).first()
                if not courier:
                    emit('error', {'message': 'Courier record not found'})
                    socket_log(f' Join rejected: No courier record for user {user.id}')
                    return

                id_room = f"courier_{courier.id}"
                join_room(id_room)

                sid = request.sid
                with connected_couriers_lock:
                    old_sids = [s for s, cid in connected_couriers.items() if cid == courier.id]
                    for osid in old_sids:
                        connected_couriers.pop(osid, None)
                    connected_couriers[sid] = courier.id

                socket_log(f' ✅ Courier {courier.id} (User {user.id}) joined {room}, {id_room}')

                emit('courier_count_update', {
                    'courier_id': courier.id,
                    'is_online': True
                }, room='admin_room')

                if courier.current_location_lat and courier.current_location_lng:
                    socket_log(f' 📍 Proactive location broadcast for Courier {courier.id} on connect')
                    emit('courier_location_update', {
                        'courier_id': courier.id,
                        'name': courier.full_name,
                        'lat': courier.current_location_lat,
                        'lng': courier.current_location_lng,
                        'status': 'idle' if courier.is_available else 'offline',
                        'timestamp': datetime.utcnow().isoformat(),
                        'is_initial': True
                    }, room='admin_room')

                emit('joined', {'room': id_room, 'message': f'Joined courier room {courier.id}'})

            elif role == 'customer':
                id_room = f"customer_{user.id}"
                join_room(id_room)
                socket_log(f' ✅ Customer {user.id} joined {room}, {id_room}')
                emit('joined', {'room': id_room, 'message': f'Joined customer room {user.id}'})

            elif role == 'admin':
                id_room = f"admin_{user.id}"
                join_room(id_room)
                socket_log(f' ✅ Admin {user.id} joined {room}, {id_room}')
                emit('joined', {'room': id_room, 'message': f'Joined admin room {user.id}'})

            else:
                socket_log(f' ✅ Guest {user.id} joined {room}')
                emit('joined', {'room': room, 'message': f'Joined {role} room'})

        except Exception as e:
            emit('error', {'message': f'Authentication failed: {str(e)}'})
            socket_log(f' Join rejected: {str(e)} (SID: {request.sid})')
    
    @socketio.on('join_delivery_room')
    @socket_auth_required(allowed_roles={'customer', 'admin'})
    def handle_join_delivery_room(data):
        """Customer joins the tracking room for a specific delivery"""
        delivery_id = data.get('delivery_id')
        if delivery_id:
            join_room(f'delivery_{delivery_id}')
            socket_log(f' Socket {request.sid} joined delivery_{delivery_id}')
            emit('joined_delivery_room', {'delivery_id': delivery_id})

    @socketio.on('leave')
    def handle_leave(data):
        role = data.get('role', 'guest')
        room = f"{role}_room"
        leave_room(room)
        logger.info(f' User left room: {room} (SID: {request.sid})')
        emit('left', {'room': room, 'message': f'Left {role} room'})
    
    @socketio.on('new_order_notification')
    @socket_auth_required(allowed_roles={'admin'})
    def handle_new_order(data):
        """הודעה על הזמנה חדשה"""
        order_id = data.get('order_id')
        logger.info(f' New order notification: {order_id}')
        
        # שלח לכל המנהלים
        emit('new_order', data, room='admin_room')
        
        # שלח לכל השליחים הזמינים
        emit('new_order_offer', data, room='courier_room')
    
    @socketio.on('order_status_update')
    @socket_auth_required(allowed_roles={'courier', 'admin'}, self_check_field='courier_id')
    def handle_status_update(data):
        """עדכון סטטוס הזמנה"""
        order_id = data.get('order_id')
        new_status = data.get('status')
        courier_id = data.get('courier_id')
        logger.info(f' Order {order_id} status updated to: {new_status}')
        
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
    @socket_auth_required(allowed_roles={'courier'}, self_check_field='courier_id')
    def handle_location_update(data):
        """עדכון מיקום שליח"""
        courier_id = data.get('courier_id')
        # Support both lat/lng (client) and latitude/longitude (legacy)
        lat = data.get('lat') or data.get('latitude')
        lng = data.get('lng') or data.get('longitude')
        timestamp = data.get('timestamp', datetime.utcnow().isoformat())
        
        if not lat or not lng:
            return
            
        logger.info(f' Courier {courier_id} location update: {lat}, {lng}')
        
        # Prepare broadcast data
        location_data = {
            'courier_id': courier_id,
            'lat': lat,
            'lng': lng,
            'timestamp': timestamp,
            'delivery_id': data.get('delivery_id')
        }
        
        # 1. Send to Admins (Monitoring)
        logger.info(f' 📡 Broadcasting location for {courier_id} to admin_room')
        emit('courier_location_update', location_data, room='admin_room')
        
        # 2. Trigger stats refresh for admins
        # This ensures the "Active Couriers" count updates when a courier sends location
        emit('courier_availability_update', {
            'courier_id': courier_id,
            'is_available': True # Sending location implies activity
        }, room='admin_room')
        
        # 3. Update specific delivery tracking users
        delivery_id = data.get('delivery_id')
        if delivery_id:
            emit('delivery_location_update', location_data, room=f'delivery_{delivery_id}')
            
        # 4. Also update the specific customer if known
        customer_id = data.get('customer_id')
        if customer_id:
             emit('courier_location', location_data, room=f'customer_{customer_id}')
    
    @socketio.on('courier_availability_changed')
    @socket_auth_required(allowed_roles={'courier'}, self_check_field='courier_id')
    def handle_availability_changed(data):
        """עדכון זמינות מהיר ישירות מהסוקט (Layer 1 Sync)"""
        courier_id = data.get('courier_id')
        is_available = data.get('is_available')
        
        if courier_id is not None and is_available is not None:
            logger.info(f" Fast Sync: Courier {courier_id} availability -> {is_available}")
            emit('courier_availability_update', {
                'courier_id': courier_id,
                'is_available': is_available,
                'timestamp': data.get('timestamp', datetime.utcnow().isoformat())
            }, room='admin_room')

    @socketio.on('message')
    def handle_message(data):
        """הודעות כלליות"""
        logger.info(f' Message received: {data}')
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