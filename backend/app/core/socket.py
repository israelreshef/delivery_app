import socketio
import asyncio
from typing import Any
from app.core.db import SessionLocal
from app.crud.courier import courier as crud_courier
from app.crud.user import user as crud_user
from app.schemas.courier import CourierUpdate

# Allow all origins for now
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    # data: {'room': 'courier_1'}
    room = data.get('room')
    if room:
        await sio.enter_room(sid, room)
        print(f"Client {sid} joined room {room}")

@sio.event
async def leave_room(sid, data):
    room = data.get('room')
    if room:
        await sio.leave_room(sid, room)
        print(f"Client {sid} left room {room}")

@sio.event
async def update_location(sid, data):
    """
    Expects data: {
        'user_id': int,
        'lat': float,
        'lng': float
    }
    """
    try:
        user_id = data.get('user_id')
        lat = data.get('lat')
        lng = data.get('lng')
        
        if not user_id or lat is None or lng is None:
            return
            
        print(f"Location update from user {user_id}: {lat}, {lng}")
        
        # Broadcast to tracking room
        await sio.emit('courier_location', data, room=f"tracking_courier_{user_id}")
        await sio.emit('courier_location', data, room="admin_tracking")

        # Update DB (Sync operation - potentially blocking, be careful in heavy load)
        # Ideally verify user identity via token in connect, but for MVP trust the ID or rely on handshake auth
        # For now, let's just update the DB
        
        # We need to run this in a thread to avoid blocking the async event loop
        await asyncio.to_thread(update_db_location, user_id, lat, lng)
        
    except Exception as e:
        print(f"Error updating location: {e}")

def update_db_location(user_id: int, lat: float, lng: float):
    with SessionLocal() as db:
        courier = crud_courier.get_by_user_id(db, user_id=user_id)
        if courier:
            crud_courier.update(db, db_obj=courier, obj_in=CourierUpdate(
                current_latitude=lat,
                current_longitude=lng,
                is_online=True # Implicitly online if sending updates
            ))
