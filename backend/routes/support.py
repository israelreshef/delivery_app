from flask import Blueprint, request, jsonify, current_app
from models import db, SupportTicket, TicketMessage, User, Delivery, Notification, CustomerTask, support_ticket_status_enum, AuditLog
from utils.decorators import token_required, role_required, permission_required
from datetime import datetime
from sqlalchemy import desc, or_
from services.notifications import send_push_notification
from extensions import socketio
import os
import uuid
from werkzeug.utils import secure_filename

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


def _generate_ticket_number(user_id):
    last_ticket = SupportTicket.query.filter_by(user_id=user_id).order_by(desc(SupportTicket.id)).first()
    if last_ticket and last_ticket.ticket_number:
        try:
            next_num = int(last_ticket.ticket_number) + 1
        except (ValueError, TypeError):
            next_num = 1
    else:
        next_num = 1
    return f"{next_num:03d}"


def _get_first_message_text(ticket):
    first_msg = ticket.messages.order_by(TicketMessage.created_at).first()
    if first_msg:
        return first_msg.message[:100]
    return ""


def _ticket_category(t):
    """Classify a ticket by the origin of the request:
    - admin-created (system/phone)  -> 'service'
    - courier app                   -> 'courier'
    - customer app                  -> 'customer'
    """
    user_type = t.user.user_type if t.user else None
    if user_type == 'courier':
        return 'courier'
    if user_type == 'customer':
        return 'customer'
    return 'service'


def _serialize_ticket(t, current_user=None):
    assigned_to_user = User.query.get(t.assigned_to) if t.assigned_to else None
    first_message = _get_first_message_text(t)
    message_count = t.messages.count()
    return {
        'id': t.id,
        'ticket_number': t.ticket_number or f"{t.id:03d}",
        'subject': t.subject,
        'status': t.status,
        'priority': t.priority,
        'category': _ticket_category(t),
        'created_at': t.created_at.strftime('%Y-%m-%d %H:%M'),
        'user_id': t.user_id,
        'user_name': t.user.username if t.user else "Unknown",
        'assigned_to': t.assigned_to,
        'assigned_to_name': assigned_to_user.username if assigned_to_user else None,
        'order_id': t.order_id,
        'first_message': first_message,
        'message_count': message_count
    }


_CATEGORY_USER_TYPES = {
    'service': ['admin'],
    'courier': ['courier'],
    'customer': ['customer'],
}


@support_bp.route('/tickets', methods=['POST'])
@token_required
@permission_required('support:create')
def create_ticket(current_user):
    try:
        data = request.get_json()

        if current_user.user_type == 'courier':
            open_count = SupportTicket.query.filter(
                SupportTicket.user_id == current_user.id,
                SupportTicket.status.in_(['open', 'in_progress'])
            ).count()
            if open_count >= 2:
                return jsonify({'error': 'לא ניתן לפתוח יותר משני פניות במקביל'}), 400

        ticket_number = _generate_ticket_number(current_user.id)

        ticket = SupportTicket(
            user_id=current_user.id,
            subject=data.get('subject', f"פנייה #{ticket_number}"),
            order_id=data.get('order_id'),
            priority=data.get('priority', 'medium'),
            status='open',
            assigned_to=data.get('assigned_to'),
            ticket_number=ticket_number
        )

        db.session.add(ticket)
        db.session.commit()

        if data.get('assigned_to'):
            assigned_user_id = data.get('assigned_to')
            assigned_user = User.query.get(assigned_user_id)
            task = CustomerTask(
                customer_id=None,
                title=f"קריאת תמיכה #{ticket.ticket_number}: {ticket.subject}",
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
            notification_message = f'הוקצתה לך קריאת תמיכה #{ticket.ticket_number} - {ticket.subject}'
            note = Notification(
                user_id=assigned_user_id,
                delivery_id=None,
                type='push',
                title=notification_title,
                message=notification_message,
                is_read=False
            )
            db.session.add(note)

            if assigned_user and getattr(assigned_user, 'fcm_token', None):
                send_push_notification(
                    assigned_user.fcm_token,
                    notification_title,
                    notification_message,
                    data={'support_ticket_id': ticket.id, 'type': 'support_assignment'}
                )

            ticket.status = 'in_progress'
            db.session.commit()

        if data.get('message'):
            attachments = data.get('attachments', [])
            initial_msg = TicketMessage(
                ticket_id=ticket.id,
                sender_id=current_user.id,
                message=data.get('message'),
                is_internal=False,
                attachments=attachments if attachments else None
            )
            db.session.add(initial_msg)
            db.session.commit()

        audit = AuditLog(user_id=current_user.id, action='CREATE_TICKET', resource_type='SupportTicket', resource_id=str(ticket.id), details=f"Created ticket #{ticket.ticket_number}: {ticket.subject}")
        db.session.add(audit)
        db.session.commit()
        ticket_event = {'id': ticket.id, 'ticket_number': ticket.ticket_number, 'subject': ticket.subject, 'assigned_to': ticket.assigned_to, 'user_id': ticket.user_id}
        socketio.emit('ticket_created', ticket_event, room='support_agents')
        socketio.emit('ticket_created', ticket_event, room=f'user_{ticket.user_id}')

        return jsonify({'message': 'Ticket created successfully', 'id': ticket.id, 'ticket_number': ticket.ticket_number}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@support_bp.route('/tickets', methods=['GET'])
@token_required
@permission_required('support:view')
def get_tickets(current_user):
    try:
        query = SupportTicket.query
        status = request.args.get('status')
        priority = request.args.get('priority')
        assigned_to = request.args.get('assigned_to')
        category = request.args.get('category')
        search_query = (request.args.get('q') or '').strip()

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

        if status:
            query = query.filter_by(status=status)
        if priority:
            query = query.filter_by(priority=priority)

        user_joined = False
        if category:
            allowed_types = _CATEGORY_USER_TYPES.get(category)
            if allowed_types:
                query = query.join(User, SupportTicket.user_id == User.id)
                user_joined = True
                query = query.filter(User.user_type.in_(allowed_types))
        if assigned_to:
            if assigned_to == 'me':
                query = query.filter_by(assigned_to=current_user.id)
            else:
                query = query.filter_by(assigned_to=assigned_to)

        if search_query:
            criteria = [
                SupportTicket.subject.ilike(f'%{search_query}%'),
                SupportTicket.ticket_number.ilike(f'%{search_query}%'),
                User.username.ilike(f'%{search_query}%')
            ]
            if search_query.isdigit():
                criteria.append(SupportTicket.id == int(search_query))
            if not user_joined:
                query = query.join(User, SupportTicket.user_id == User.id)
            query = query.filter(or_(*criteria))

        tickets = query.order_by(desc(SupportTicket.created_at)).all()

        result = [_serialize_ticket(t, current_user) for t in tickets]

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@support_bp.route('/tickets/<int:ticket_id>', methods=['GET'])
@token_required
@permission_required('support:view')
def get_ticket_details(current_user, ticket_id):
    try:
        ticket = SupportTicket.query.get_or_404(ticket_id)

        if not _can_access_ticket(current_user, ticket):
            return jsonify({'error': 'Unauthorized'}), 403

        messages = []
        now_dt = datetime.utcnow()
        needs_commit = False

        for msg in ticket.messages.order_by(TicketMessage.created_at).all():
            if msg.is_internal and not _is_staff_user(current_user):
                continue

            is_read = msg.read_at is not None

            # Mark as read if viewed by someone other than the sender
            if msg.sender_id != current_user.id and msg.read_at is None:
                msg.read_at = now_dt
                needs_commit = True
                is_read = True

            messages.append({
                'id': msg.id,
                'sender_id': msg.sender_id,
                'sender_name': msg.sender.username if msg.sender else "Unknown",
                'message': msg.message,
                'is_internal': msg.is_internal,
                'attachments': msg.attachments or [],
                'created_at': msg.created_at.strftime('%Y-%m-%d %H:%M'),
                'is_staff': _is_staff_user(msg.sender) if msg.sender else False,
                'is_read': is_read
            })

        if needs_commit:
            db.session.commit()

        ticket_data = _serialize_ticket(ticket, current_user)
        return jsonify({
            'ticket': ticket_data,
            'messages': messages
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@support_bp.route('/tickets/<int:ticket_id>/messages', methods=['POST'])
@token_required
@permission_required('support:comment')
def add_message(current_user, ticket_id):
    try:
        ticket = SupportTicket.query.get_or_404(ticket_id)

        if not _can_access_ticket(current_user, ticket):
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()

        msg = TicketMessage(
            ticket_id=ticket.id,
            sender_id=current_user.id,
            message=data.get('message'),
            is_internal=data.get('is_internal', False) if _is_staff_user(current_user) else False,
            attachments=data.get('attachments', []) if not data.get('is_internal') else []
        )

        db.session.add(msg)

        if _is_staff_user(current_user):
            if ticket.status == 'open':
                ticket.status = 'in_progress'
            elif ticket.status not in ['resolved', 'closed']:
                ticket.status = 'waiting_for_customer'
        else:
            ticket.status = 'in_progress'

        db.session.commit()

        audit = AuditLog(user_id=current_user.id, action='ADD_TICKET_MESSAGE', resource_type='SupportTicket', resource_id=str(ticket.id), details='Added message')
        db.session.add(audit)
        db.session.commit()

        socketio.emit('ticket_updated', {'id': ticket.id, 'ticket_number': ticket.ticket_number, 'status': ticket.status},
                      room='support_agents')
        socketio.emit('ticket_updated', {'id': ticket.id, 'ticket_number': ticket.ticket_number, 'status': ticket.status},
                      room=f'user_{ticket.user_id}')
        if not msg.is_internal:
            message_event = {
                'ticket_id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'message_id': msg.id,
                'message': data.get('message'),
                'sender_id': current_user.id,
                'sender_name': current_user.username,
                'attachments': data.get('attachments', []),
                'created_at': msg.created_at.strftime('%Y-%m-%d %H:%M') if msg.created_at else None,
                'is_staff': _is_staff_user(current_user)
            }
            socketio.emit('ticket_message_added', message_event, room=f'ticket_{ticket.id}')
            socketio.emit('ticket_message_added', message_event, room='support_agents')
            socketio.emit('ticket_message_added', message_event, room=f'user_{ticket.user_id}')

        return jsonify({'message': 'Message added', 'id': msg.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@support_bp.route('/tickets/<int:ticket_id>', methods=['PUT'])
@token_required
@role_required(['admin', 'support'])
@permission_required('support:edit')
def update_ticket(current_user, ticket_id):
    try:
        ticket = SupportTicket.query.get_or_404(ticket_id)
        data = request.get_json()

        if 'status' in data:
            ticket.status = data['status']
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

            if new_assignee and new_assignee != old_assignee:
                task = CustomerTask(
                    customer_id=None,
                    title=f"קריאת תמיכה #{ticket.ticket_number}: {ticket.subject}",
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
                notification_message = f'קריאת תמיכה #{ticket.ticket_number} הוקצתה אליך: {ticket.subject}'
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
        update_event = {'id': ticket.id, 'ticket_number': ticket.ticket_number, 'status': ticket.status, 'assigned_to': ticket.assigned_to}
        socketio.emit('ticket_updated', update_event, room='support_agents')
        socketio.emit('ticket_updated', update_event, room=f'ticket_{ticket.id}')
        socketio.emit('ticket_updated', update_event, room=f'user_{ticket.user_id}')

        return jsonify({'message': 'Ticket updated'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic', 'heif'}


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@support_bp.route('/upload', methods=['POST'])
@token_required
def upload_file(current_user):
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '' or not _allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp, bmp'}), 400

        ext = secure_filename(file.filename).rsplit('.', 1)[1].lower()
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads', 'support')
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, unique_name)
        file.save(file_path)

        url = f"/static/uploads/support/{unique_name}"

        return jsonify({'url': url, 'filename': unique_name}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
