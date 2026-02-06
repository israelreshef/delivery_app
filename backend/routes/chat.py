from flask import Blueprint, request, jsonify
from models import db, ChatSession, ChatMessage, User
from utils.decorators import token_required

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/sessions', methods=['GET'])
@token_required
def get_user_sessions(current_user):
    """Get all chat sessions for the current user"""
    if current_user.role == 'admin':
        # Admins see all active sessions or recent ones
        sessions = ChatSession.query.order_by(ChatSession.updated_at.desc()).limit(50).all()
    else:
        sessions = ChatSession.query.filter_by(user_id=current_user.id).order_by(ChatSession.updated_at.desc()).all()
        
    result = []
    for s in sessions:
        last_msg = ChatMessage.query.filter_by(session_id=s.id).order_by(ChatMessage.timestamp.desc()).first()
        result.append({
            'id': s.id,
            'status': s.status,
            'user_name': s.user.username,
            'last_message': last_msg.message if last_msg else '',
            'updated_at': s.updated_at.isoformat()
        })
        
    return jsonify(result), 200

@chat_bp.route('/history/<int:session_id>', methods=['GET'])
@token_required
def get_chat_history(current_user, session_id):
    """Get messages for a specific session"""
    session = ChatSession.query.get_or_404(session_id)
    
    # Permission check
    if current_user.role != 'admin' and session.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    messages = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp.asc()).all()
    
    return jsonify([{
        'id': m.id,
        'sender_id': m.sender_id,
        'message': m.message,
        'is_read': m.is_read,
        'timestamp': m.timestamp.isoformat(),
        'is_me': m.sender_id == current_user.id
    } for m in messages]), 200

@chat_bp.route('/start', methods=['POST'])
@token_required
def start_chat(current_user):
    """Create or get active session"""
    # Check for existing active session
    session = ChatSession.query.filter_by(user_id=current_user.id, status='active').first()
    
    if not session:
        session = ChatSession(user_id=current_user.id, status='active')
        db.session.add(session)
        db.session.commit()
        
    return jsonify({'id': session.id, 'status': session.status}), 200
