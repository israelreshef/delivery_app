# backend/sockets/__init__.py

from flask import request
from flask_socketio import SocketIO

def init_sockets(socketio: SocketIO):
    @socketio.on('connect')
    def handle_connect():
        print(f'✅ לקוח התחבר ל-SocketIO! ID: {request.sid}')

    @socketio.on('disconnect')
    def handle_disconnect():
        print(f'❌ לקוח התנתק: {request.sid}')

    # נוכל להוסיף כאן אירועים נוספים כמו take_order, update_status וכו'