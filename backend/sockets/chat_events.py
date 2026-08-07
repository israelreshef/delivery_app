from flask_socketio import emit, join_room, leave_room
from flask import request
from extensions import db
from models import User, ChatSession, ChatMessage
from datetime import datetime
import functools
import logging

from .delivery_events import get_socket_user_record

logger = logging.getLogger(__name__)

def register_chat_events(socketio):
    
    # --------------------------------------------------------------------------
    # Authentication (enforced via the connect-time JWT, never client data)
    # --------------------------------------------------------------------------
    def authenticated_only(f):
        @functools.wraps(f)
        def wrapped(*args, **kwargs):
            user = get_socket_user_record()
            if user is None:
                emit('error', {'message': 'Authentication required'})
                return
            return f(user, *args, **kwargs)
        return wrapped

    @socketio.on('join_chat')
    @authenticated_only
    def handle_join_chat(user, data):
        """User/Admin joins a specific chat room (owner or admin only)."""
        data = data or {}
        role = user.user_type  # server-authoritative role
        session_id = data.get('session_id')

        # Admin joins the general support room to see incoming requests.
        if role in ('admin', 'support_agent') and not session_id:
            join_room('support_agents')
            logger.info('User %s joined support_agents room', user.id)
            return

        if session_id:
            session = ChatSession.query.get(session_id)
            if session is None:
                emit('error', {'message': 'Chat session not found'})
                return
            is_admin = role in ('admin', 'support_agent')
            if not is_admin and session.user_id != user.id:
                emit('error', {'message': 'You are not allowed to join this chat session'})
                return

            join_room(f"chat_{session_id}")
            print(f"User {user.id} joined room chat_{session_id}")

            # If admin, also subscribe to updates.
            if is_admin:
                emit('admin_joined', {'admin_id': user.id}, room=f"chat_{session_id}")

    @socketio.on('start_session')
    @authenticated_only
    def handle_start_session(user, data):
        """Customer/courier starts a new chat session (owner derived from JWT)."""
        user_id = user.id
        try:
            # Reuse an existing active session for the same user if present.
            session = ChatSession.query.filter_by(user_id=user_id, status='active').first()
            if not session:
                session = ChatSession(user_id=user_id, status='active')
                db.session.add(session)
                db.session.commit()

            join_room(f"chat_{session.id}")

            # Notify admins.
            emit('new_chat_request', {
                'session_id': session.id,
                'user_id': user_id,
                'created_at': session.created_at.isoformat() if session.created_at else None
            }, room='support_agents')

            # Notify user.
            emit('session_created', {'session_id': session.id})
        except Exception as e:
            db.session.rollback()
            logger.error('start_session failed: %s', e, exc_info=True)
            emit('error', {'message': 'failed_to_start_session'})

    @socketio.on('send_message')
    @authenticated_only
    def handle_send_message(user, data):
        """Send a message in a chat session (identity enforced from JWT)."""
        data = data or {}
        session_id = data.get('session_id')
        text = data.get('message')

        if not session_id or not text:
            logger.warning('send_message ignored: missing session_id/message')
            return

        session = ChatSession.query.get(session_id)
        if session is None:
            emit('error', {'message': 'Chat session not found'})
            return

        is_admin = user.user_type in ('admin', 'support_agent')
        if not is_admin and session.user_id != user.id:
            emit('error', {'message': 'You are not allowed to send in this chat session'})
            return

        try:
            msg = ChatMessage(
                session_id=session_id,
                sender_id=user.id,  # server-authoritative sender (no spoofing)
                message=text,
                is_read=False
            )
            db.session.add(msg)
            db.session.commit()

            # Broadcast to room.
            emit('new_message', {
                'id': msg.id,
                'sender_id': user.id,
                'message': text,
                'timestamp': msg.timestamp.isoformat() if msg.timestamp else None
            }, room=f"chat_{session_id}")
        except Exception as e:
            db.session.rollback()
            logger.error('send_message failed: %s', e, exc_info=True)
            emit('error', {'message': 'failed_to_save_message'}, room=request.sid)