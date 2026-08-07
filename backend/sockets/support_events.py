from flask_socketio import emit, join_room, leave_room
from flask import request
import logging

logger = logging.getLogger(__name__)

def register_support_events(socketio):
    """
    Socket.IO handlers for the support-ticket realtime channel.
    Clients call `join_support` after connecting to subscribe to the rooms
    relevant for their role:
      - admins join the 'support_agents' room (all ticket updates)
      - customers/couriers join 'user_<user_id>' (their own ticket updates)
      - any client that opens a specific ticket joins 'ticket_<ticket_id>'
    """

    @socketio.on('join_support')
    def handle_join_support(data):
        data = data or {}
        role = data.get('role')
        user_id = data.get('user_id')

        if role == 'admin':
            join_room('support_agents')
            logger.debug('Socket %s joined support_agents room', request.sid)
            emit('joined_support', {'role': 'admin'}, room=request.sid)
        elif user_id:
            join_room(f'user_{user_id}')
            logger.debug('Socket %s joined user_%s room', request.sid, user_id)
            emit('joined_support', {'role': role, 'user_id': user_id}, room=request.sid)
        else:
            logger.warning('join_support ignored: unknown role/user')

    @socketio.on('leave_support')
    def handle_leave_support(data):
        data = data or {}
        role = data.get('role')
        user_id = data.get('user_id')

        if role == 'admin':
            leave_room('support_agents')
        elif user_id:
            leave_room(f'user_{user_id}')

    @socketio.on('join_ticket_room')
    def handle_join_ticket_room(data):
        data = data or {}
        ticket_id = data.get('ticket_id')
        if ticket_id:
            join_room(f'ticket_{ticket_id}')
            logger.debug('Socket %s joined ticket_%s room', request.sid, ticket_id)

    @socketio.on('leave_ticket_room')
    def handle_leave_ticket_room(data):
        data = data or {}
        ticket_id = data.get('ticket_id')
        if ticket_id:
            leave_room(f'ticket_{ticket_id}')
