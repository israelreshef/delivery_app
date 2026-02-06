from flask_socketio import emit, join_room, leave_room
from flask import request
from extensions import db
from models import User, ChatSession, ChatMessage
from datetime import datetime
import functools

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

    @socketio.on('join_chat')
    def handle_join_chat(data):
        """User/Admin joins a specific chat room"""
        user_id = data.get('user_id')
        role = data.get('role') # 'admin', 'customer', 'courier'
        session_id = data.get('session_id')
        
        if not user_id:
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
        user_id = data.get('user_id')
        
        # Create session in DB
        session = ChatSession(user_id=user_id, status='active')
        db.session.add(session)
        db.session.commit()
        
        # Join the room
        join_room(f"chat_{session.id}")
        
        # Notify admins
        emit('new_chat_request', {
            'session_id': session.id,
            'user_id': user_id,
            'created_at': session.created_at.isoformat()
        }, room='support_agents')
        
        # Notify user
        emit('session_created', {'session_id': session.id}, room=request.sid)

    @socketio.on('send_message')
    def handle_send_message(data):
        """Send a message in a chat session"""
        session_id = data.get('session_id')
        sender_id = data.get('sender_id')
        text = data.get('message')
        
        if not session_id or not sender_id or not text:
            return
            
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
            'timestamp': msg.timestamp.isoformat()
        }, room=f"chat_{session_id}")
