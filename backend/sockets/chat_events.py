from flask_socketio import emit, join_room, leave_room
from flask import request
from extensions import db
from models import User, ChatSession, ChatMessage
from datetime import datetime
import functools
import logging

logger = logging.getLogger(__name__)

def register_chat_events(socketio):
    
    # --------------------------------------------------------------------------
    # Authentication (Simplified for WebSocket)
    # --------------------------------------------------------------------------
    def authenticated_only(f):
        @functools.wraps(f)
        def wrapped(*args, **kwargs):
            # In a real app, you'd validate the token from args or connection context
            # Here we trust the client sends user_id for simplicity in this MVP
            return f(*args, **kwargs)
        return wrapped

    def _pick_user_id(data):
        """Extract the user id regardless of which field name the client sent."""
        if not isinstance(data, dict):
            return None
        return data.get('user_id') or data.get('courier_id') or data.get('customer_id')

    @socketio.on('join_chat')
    def handle_join_chat(data):
        """User/Admin joins a specific chat room"""
        data = data or {}
        user_id = _pick_user_id(data)
        role = data.get('role')  # 'admin', 'customer', 'courier'
        session_id = data.get('session_id')
        
        if not user_id:
            logger.warning('join_chat ignored: missing user id')
            return
            
        # Admin joins the general support room to see incoming requests
        if role == 'admin' and not session_id:
            join_room('support_agents')
            print(f"User {user_id} joined support_agents room")
            return

        # User joins their specific chat session
        if session_id:
            join_room(f"chat_{session_id}")
            print(f"User {user_id} joined room chat_{session_id}")
            
            # If admin, also subscribe to updates
            if role == 'admin':
                emit('admin_joined', {'admin_id': user_id}, room=f"chat_{session_id}")

    @socketio.on('start_session')
    def handle_start_session(data):
        """Customer starts a new chat session"""
        data = data or {}
        user_id = _pick_user_id(data)
        
        if not user_id:
            logger.warning('start_session ignored: missing user id')
            return
            
        try:
            # Reuse an existing active session for the same user if present
            session = ChatSession.query.filter_by(user_id=user_id, status='active').first()
            if not session:
                session = ChatSession(user_id=user_id, status='active')
                db.session.add(session)
                db.session.commit()
            
            # Join the room
            join_room(f"chat_{session.id}")
            
            # Notify admins
            emit('new_chat_request', {
                'session_id': session.id,
                'user_id': user_id,
                'created_at': session.created_at.isoformat() if session.created_at else None
            }, room='support_agents')
            
            # Notify user
            emit('session_created', {'session_id': session.id}, room=request.sid)
        except Exception as e:
            db.session.rollback()
            logger.error('start_session failed: %s', e, exc_info=True)
            emit('error', {'message': 'failed_to_start_session'}, room=request.sid)

    @socketio.on('send_message')
    def handle_send_message(data):
        """Send a message in a chat session"""
        data = data or {}
        session_id = data.get('session_id')
        sender_id = data.get('sender_id') or _pick_user_id(data)
        text = data.get('message')
        
        if not session_id or not sender_id or not text:
            logger.warning('send_message ignored: missing session_id/sender_id/message')
            return
            
        try:
            # Save to DB
            msg = ChatMessage(
                session_id=session_id,
                sender_id=sender_id,
                message=text,
                is_read=False
            )
            db.session.add(msg)
            db.session.commit()
            
            # Broadcast to room
            emit('new_message', {
                'id': msg.id,
                'sender_id': sender_id,
                'message': text,
                'timestamp': msg.timestamp.isoformat() if msg.timestamp else None
            }, room=f"chat_{session_id}")
        except Exception as e:
            db.session.rollback()
            logger.error('send_message failed: %s', e, exc_info=True)
            emit('error', {'message': 'failed_to_save_message'}, room=request.sid)
