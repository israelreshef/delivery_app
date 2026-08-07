from flask_socketio import emit, join_room, leave_room
from flask import request
import logging

from .delivery_events import get_socket_user_record

logger = logging.getLogger(__name__)

# Staff roles that may join the shared 'support_agents' room.
SUPPORT_STAFF_ROLES = ('admin', 'support_agent')


def _is_staff(user):
    return user is not None and user.user_type in SUPPORT_STAFF_ROLES


def register_support_events(socketio):
    """
    Socket.IO handlers for the support-ticket realtime channel.

    Every handler authenticates against the connect-time JWT
    (``get_socket_user_record``), and room memberships are derived purely from
    the server-verified identity — client-supplied ``role``/``user_id`` values
    are ignored to prevent room spoofing (BOLA):
      - staff (admin / support_agent) -> 'support_agents' room (all tickets)
      - any authenticated user         -> 'user_<id>' room (only their tickets)
      - ticket rooms are joined only by the ticket owner, its assigned staff,
        or staff members generally.
    """

    @socketio.on('join_support')
    def handle_join_support(data):
        user = get_socket_user_record()
        if user is None:
            emit('error', {'message': 'Authentication required'})
            return

        if _is_staff(user):
            join_room('support_agents')
            logger.debug('Socket %s (user %s) joined support_agents room', request.sid, user.id)
            emit('joined_support', {'role': user.user_type})
        else:
            # Users join their own room only (owner of the user_id).
            join_room(f'user_{user.id}')
            logger.debug('Socket %s joined user_%s room', request.sid, user.id)
            emit('joined_support', {'role': user.user_type, 'user_id': user.id})

    @socketio.on('leave_support')
    def handle_leave_support(data):
        user = get_socket_user_record()
        if user is None:
            return
        if _is_staff(user):
            leave_room('support_agents')
        else:
            leave_room(f'user_{user.id}')

    @socketio.on('join_ticket_room')
    def handle_join_ticket_room(data):
        from models import SupportTicket

        ticket_id = (data or {}).get('ticket_id')
        if not ticket_id:
            emit('error', {'message': 'ticket_id is required'})
            return

        user = get_socket_user_record()
        if user is None:
            emit('error', {'message': 'Authentication required'})
            return

        ticket = SupportTicket.query.filter_by(id=ticket_id).first()
        if not ticket:
            emit('error', {'message': 'Ticket not found'})
            return

        is_staff = _is_staff(user)
        is_assigned_staff = is_staff or (ticket.assigned_to == user.id)
        is_owner = ticket.user_id == user.id

        if not (is_assigned_staff or is_owner):
            logger.warning('Blocked socket %s (user %s) from joining ticket_%s',
                           request.sid, user.id, ticket_id)
            emit('error', {'message': 'You are not allowed to join this ticket'})
            return

        join_room(f'ticket_{ticket_id}')
        logger.debug('Socket %s joined ticket_%s room', request.sid, ticket_id)
        emit('joined_ticket_room', {'ticket_id': ticket_id})

    @socketio.on('leave_ticket_room')
    def handle_leave_ticket_room(data):
        ticket_id = (data or {}).get('ticket_id')
        if ticket_id:
            leave_room(f'ticket_{ticket_id}')