# backend/sockets/__init__.py

from flask import request
from flask_socketio import SocketIO
from .delivery_events import register_socket_events
from .chat_events import register_chat_events

def init_sockets(socketio: SocketIO):
    @socketio.on('connect')
    def handle_connect(auth=None):
        # Authenticated connect logic is handled within registered events
        print(f' 🔌 Generic connection event: {request.sid}')
        return True

    @socketio.on('disconnect')
    def handle_disconnect():
        print(f' 🔌 Generic disconnect event: {request.sid}')

    # Register specialized event modules
    register_socket_events(socketio)
    register_chat_events(socketio)