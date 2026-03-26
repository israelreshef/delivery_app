from flask import Blueprint, request, jsonify
from models import db, SupportTicket, TicketMessage, User, Delivery, Notification, CustomerTask, support_ticket_status_enum, AuditLog
from utils.decorators import token_required, role_required, permission_required
from datetime import datetime
from sqlalchemy import desc, or_
from services.notifications import send_push_notification
from extensions import socketio

support_bp = Blueprint('support', __name__)


def _is_staff_user(user):
    if not user:
        return False
    if user.user_type == 'admin':
        return True
    admin_role = getattr(user, 'admin_role', None)
    return admin_role in ['support_admin', 'super_admin']


def _can_access_ticket(user, ticket):
    if _is_staff_user(user):
        return True
    if user.user_type == 'courier':
        return ticket.user_id == user.id or ticket.assigned_to == user.id
    return ticket.user_id == user.id


@support_bp.route('/tickets', methods=['POST'])
@token_required
@permission_required('support:create')
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
            status='open',
            assigned_to=data.get('assigned_to')
        )
        
        db.session.add(ticket)
        db.session.commit()

        # If ticket was assigned at creation, create matching task and send notification
        if data.get('assigned_to'):
            assigned_user_id = data.get('assigned_to')
            assigned_user = User.query.get(assigned_user_id)
            task = CustomerTask(
                customer_id=None,
                title=f"קריאת תמיכה #{ticket.id}: {ticket.subject}",
                description=data.get('message') or data.get('subject'),
                priority=ticket.priority,
                status='in_progress',
                assigned_to=assigned_user_id,
                created_by=current_user.id,
                source='support_ticket',
                source_id=str(ticket.id)
            )
            db.session.add(task)

            notification_title = 'מטלת תמיכה חדשה'
            notification_message = f'הוקצתה לך קריאת תמיכה #{ticket.id} - {ticket.subject}'
            note = Notification(
                user_id=assigned_user_id,
                delivery_id=None,
                type='push',
                title=notification_title,
                message=notification_message,
                is_read=False
            )
            db.session.add(note)

            # Push if token available:
            if assigned_user and getattr(assigned_user, 'fcm_token', None):
                send_push_notification(
                    assigned_user.fcm_token,
                    notification_title,
                    notification_message,
                    data={'support_ticket_id': ticket.id, 'type': 'support_assignment'}
                )

            # keep ticket status in_progress
            ticket.status = 'in_progress'
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
            
        audit = AuditLog(user_id=current_user.id, action='CREATE_TICKET', resource_type='SupportTicket', resource_id=str(ticket.id), details=f"Created ticket: {ticket.subject}")
        db.session.add(audit)
        db.session.commit()
        socketio.emit('ticket_created', {'id': ticket.id, 'subject': ticket.subject, 'assigned_to': ticket.assigned_to})

        return jsonify({'message': 'Ticket created successfully', 'id': ticket.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@support_bp.route('/tickets', methods=['GET'])
@token_required
@permission_required('support:view')
def get_tickets(current_user):
    """
    Get tickets. Admins see all (with optional filters), users see their own.
    """
    try:
        query = SupportTicket.query
        status = request.args.get('status')
        priority = request.args.get('priority')
        assigned_to = request.args.get('assigned_to')
        search_query = (request.args.get('q') or '').strip()
        
        # Role based visibility
        if _is_staff_user(current_user):
            pass
        elif current_user.user_type == 'courier':
            query = query.filter(
                or_(
                    SupportTicket.user_id == current_user.id,
                    SupportTicket.assigned_to == current_user.id
                )
            )
        else:
            query = query.filter_by(user_id=current_user.id)

        # Shared filters for all roles (within their own visibility window)
        if status:
            query = query.filter_by(status=status)
        if priority:
            query = query.filter_by(priority=priority)
        if assigned_to:
            if assigned_to == 'me':
                query = query.filter_by(assigned_to=current_user.id)
            else:
                query = query.filter_by(assigned_to=assigned_to)

        if search_query:
            criteria = [
                SupportTicket.subject.ilike(f'%{search_query}%'),
                User.username.ilike(f'%{search_query}%')
            ]
            if search_query.isdigit():
                criteria.append(SupportTicket.id == int(search_query))
            query = query.join(User, SupportTicket.user_id == User.id).filter(or_(*criteria))

        tickets = query.order_by(desc(SupportTicket.created_at)).all()
        
        result = []
        for t in tickets:
            assigned_to_user = User.query.get(t.assigned_to) if t.assigned_to else None
            result.append({
                'id': t.id,
                'subject': t.subject,
                'status': t.status,
                'priority': t.priority,
                'created_at': t.created_at.strftime('%Y-%m-%d %H:%M'),
                'user_name': f"{t.user.username}" if t.user else "Unknown",
                'assigned_to': t.assigned_to,
                'assigned_to_name': assigned_to_user.username if assigned_to_user else None,
                'order_id': t.order_id
            })
            
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@support_bp.route('/tickets/<int:ticket_id>', methods=['GET'])
@token_required
@permission_required('support:view')
def get_ticket_details(current_user, ticket_id):
    """
    Get full ticket details including messages
    """
    try:
        ticket = SupportTicket.query.get_or_404(ticket_id)
        
        # Access control
        if not _can_access_ticket(current_user, ticket):
            return jsonify({'error': 'Unauthorized'}), 403
            
        messages = []
        for msg in ticket.messages.order_by(TicketMessage.created_at).all():
            # Hide internal messages from non-admins
            if msg.is_internal and not _is_staff_user(current_user):
                continue
                
            messages.append({
                'id': msg.id,
                'sender_id': msg.sender_id,
                'sender_name': msg.sender.username if msg.sender else "Unknown",
                'message': msg.message,
                'is_internal': msg.is_internal,
                'created_at': msg.created_at.strftime('%Y-%m-%d %H:%M'),
                'is_staff': _is_staff_user(msg.sender)
            })
            
        assigned_to_user = User.query.get(ticket.assigned_to) if ticket.assigned_to else None
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
                'assigned_to_name': assigned_to_user.username if assigned_to_user else None,
                'order_id': ticket.order_id
            },
            'messages': messages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@support_bp.route('/tickets/<int:ticket_id>/messages', methods=['POST'])
@token_required
@permission_required('support:comment')
def add_message(current_user, ticket_id):
    """
    Add a new message to the ticket
    """
    try:
        ticket = SupportTicket.query.get_or_404(ticket_id)
        
        if not _can_access_ticket(current_user, ticket):
            return jsonify({'error': 'Unauthorized'}), 403
            
        data = request.get_json()
        
        msg = TicketMessage(
            ticket_id=ticket.id,
            sender_id=current_user.id,
            message=data.get('message'),
            is_internal=data.get('is_internal', False) if _is_staff_user(current_user) else False
        )
        
        db.session.add(msg)
        
        # Auto-update status logic
        if _is_staff_user(current_user):
            if ticket.status == 'open':
                ticket.status = 'in_progress'
            elif ticket.status not in ['resolved', 'closed']:
                ticket.status = 'waiting_for_customer'
        else:
            # If customer replies
            ticket.status = 'in_progress'
            
        db.session.commit()

        audit = AuditLog(user_id=current_user.id, action='ADD_TICKET_MESSAGE', resource_type='SupportTicket', resource_id=str(ticket.id), details='Added message')
        db.session.add(audit)
        db.session.commit()
        socketio.emit('ticket_updated', {'id': ticket.id, 'status': ticket.status})
        if not msg.is_internal:
            socketio.emit('ticket_message_added', {'ticket_id': ticket.id, 'message_id': msg.id})
        
        return jsonify({'message': 'Message added'}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@support_bp.route('/tickets/<int:ticket_id>', methods=['PUT'])
@token_required
@role_required(['admin', 'support'])
@permission_required('support:edit')
def update_ticket(current_user, ticket_id):
    """
    Update ticket metadata (status, assignee, priority)
    """
    try:
        ticket = SupportTicket.query.get_or_404(ticket_id)
        data = request.get_json()
        
        if 'status' in data:
            ticket.status = data['status']
            # If ticket is marked as resolved or closed, update linked CustomerTask
            if data['status'] in ['resolved', 'closed']:
                linked_task = CustomerTask.query.filter_by(source='support_ticket', source_id=str(ticket.id)).first()
                if linked_task:
                    linked_task.status = 'completed'
                    linked_task.completed_at = datetime.utcnow()
        if 'priority' in data:
            ticket.priority = data['priority']

        if 'assigned_to' in data:
            new_assignee = data['assigned_to']
            old_assignee = ticket.assigned_to
            ticket.assigned_to = new_assignee

            # Create task if assigned to courier/support staff
            if new_assignee and new_assignee != old_assignee:
                task = CustomerTask(
                    customer_id=None,
                    title=f"קריאת תמיכה #{ticket.id}: {ticket.subject}",
                    description=f"טיקט תמיכה יוצא מ-CRM: {ticket.subject} ({ticket.priority})", 
                    priority=ticket.priority,
                    status='in_progress',
                    assigned_to=new_assignee,
                    created_by=current_user.id,
                    source='support_ticket',
                    source_id=str(ticket.id)
                )
                db.session.add(task)

                notification_title = 'מטלת תמיכה הוקצתה'
                notification_message = f'קריאת תמיכה #{ticket.id} הוקצתה אליך: {ticket.subject}'
                note = Notification(
                    user_id=new_assignee,
                    delivery_id=None,
                    type='push',
                    title=notification_title,
                    message=notification_message,
                    is_read=False
                )
                db.session.add(note)

                assignee_user = User.query.get(new_assignee)
                if assignee_user and getattr(assignee_user, 'fcm_token', None):
                    send_push_notification(
                        assignee_user.fcm_token,
                        notification_title,
                        notification_message,
                        data={'support_ticket_id': ticket.id, 'type': 'support_assignment'}
                    )

                ticket.status = 'in_progress'

        db.session.commit()

        audit = AuditLog(user_id=current_user.id, action='UPDATE_TICKET', resource_type='SupportTicket', resource_id=str(ticket.id), details=f"Updated ticket fields: {list(data.keys())}")
        db.session.add(audit)
        db.session.commit()
        socketio.emit('ticket_updated', {'id': ticket.id, 'status': ticket.status, 'assigned_to': ticket.assigned_to})

        return jsonify({'message': 'Ticket updated'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
