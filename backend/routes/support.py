from flask import Blueprint, request, jsonify
from models import db, SupportTicket, TicketMessage, User, Delivery, support_ticket_status_enum
from utils.decorators import token_required, role_required
from datetime import datetime
from sqlalchemy import desc

support_bp = Blueprint('support', __name__)

@support_bp.route('/tickets', methods=['POST'])
@token_required
def create_ticket(current_user):
    """
    Create a new support ticket
    """
    try:
        data = request.get_json()
        
        ticket = SupportTicket(
            user_id=current_user.id,
            subject=data.get('subject'),
            order_id=data.get('order_id'),
            priority=data.get('priority', 'medium'),
            status='open'
        )
        
        db.session.add(ticket)
        db.session.commit()
        
        # Add initial message if provided
        if data.get('message'):
            initial_msg = TicketMessage(
                ticket_id=ticket.id,
                sender_id=current_user.id,
                message=data.get('message'),
                is_internal=False
            )
            db.session.add(initial_msg)
            db.session.commit()
            
        return jsonify({'message': 'Ticket created successfully', 'id': ticket.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@support_bp.route('/tickets', methods=['GET'])
@token_required
def get_tickets(current_user):
    """
    Get tickets. Admins see all (with optional filters), users see their own.
    """
    try:
        query = SupportTicket.query
        
        # Role based filtering
        if current_user.user_type not in ['admin', 'support']:
            query = query.filter_by(user_id=current_user.id)
        else:
            # Admin filters
            status = request.args.get('status')
            priority = request.args.get('priority')
            assigned_to = request.args.get('assigned_to')
            
            if status:
                query = query.filter_by(status=status)
            if priority:
                query = query.filter_by(priority=priority)
            if assigned_to:
                if assigned_to == 'me':
                    query = query.filter_by(assigned_to=current_user.id)
                else:
                    query = query.filter_by(assigned_to=assigned_to)

        tickets = query.order_by(desc(SupportTicket.created_at)).all()
        
        result = []
        for t in tickets:
            result.append({
                'id': t.id,
                'subject': t.subject,
                'status': t.status,
                'priority': t.priority,
                'created_at': t.created_at.strftime('%Y-%m-%d %H:%M'),
                'user_name': f"{t.user.username}" if t.user else "Unknown",
                'order_id': t.order_id
            })
            
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@support_bp.route('/tickets/<int:ticket_id>', methods=['GET'])
@token_required
def get_ticket_details(current_user, ticket_id):
    """
    Get full ticket details including messages
    """
    try:
        ticket = SupportTicket.query.get_or_404(ticket_id)
        
        # Access control
        if current_user.user_type not in ['admin', 'support'] and ticket.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
            
        messages = []
        for msg in ticket.messages.order_by(TicketMessage.created_at).all():
            # Hide internal messages from non-admins
            if msg.is_internal and current_user.user_type not in ['admin', 'support']:
                continue
                
            messages.append({
                'id': msg.id,
                'sender_id': msg.sender_id,
                'sender_name': msg.sender.username if msg.sender else "Unknown",
                'message': msg.message,
                'is_internal': msg.is_internal,
                'created_at': msg.created_at.strftime('%Y-%m-%d %H:%M'),
                'is_staff': msg.sender.user_type in ['admin', 'support'] if msg.sender else False
            })
            
        return jsonify({
            'ticket': {
                'id': ticket.id,
                'subject': ticket.subject,
                'status': ticket.status,
                'priority': ticket.priority,
                'created_at': ticket.created_at.strftime('%Y-%m-%d %H:%M'),
                'user_id': ticket.user_id,
                'user_name': ticket.user.username,
                'assigned_to': ticket.assigned_to,
                'order_id': ticket.order_id
            },
            'messages': messages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@support_bp.route('/tickets/<int:ticket_id>/messages', methods=['POST'])
@token_required
def add_message(current_user, ticket_id):
    """
    Add a new message to the ticket
    """
    try:
        ticket = SupportTicket.query.get_or_404(ticket_id)
        
        if current_user.user_type not in ['admin', 'support'] and ticket.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
            
        data = request.get_json()
        
        msg = TicketMessage(
            ticket_id=ticket.id,
            sender_id=current_user.id,
            message=data.get('message'),
            is_internal=data.get('is_internal', False) if current_user.user_type in ['admin', 'support'] else False
        )
        
        db.session.add(msg)
        
        # Auto-update status logic
        if current_user.user_type in ['admin', 'support']:
            if ticket.status == 'new':
                ticket.status = 'in_progress'
            elif ticket.status == 'waiting_for_customer':
                 # Keep existing status or change? usually if admin replies it might go to waiting for customer
                 pass 
            else:
                 ticket.status = 'waiting_for_customer'
        else:
            # If customer replies
            ticket.status = 'in_progress'
            
        db.session.commit()
        
        return jsonify({'message': 'Message added'}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@support_bp.route('/tickets/<int:ticket_id>', methods=['PUT'])
@token_required
@role_required(['admin', 'support'])
def update_ticket(current_user, ticket_id):
    """
    Update ticket metadata (status, assignee, priority)
    """
    try:
        ticket = SupportTicket.query.get_or_404(ticket_id)
        data = request.get_json()
        
        if 'status' in data:
            ticket.status = data['status']
        if 'priority' in data:
            ticket.priority = data['priority']
        if 'assigned_to' in data:
            ticket.assigned_to = data['assigned_to']
            
        db.session.commit()
        return jsonify({'message': 'Ticket updated'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
