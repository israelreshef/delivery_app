from sqlalchemy.orm import Session
from app.crud.notification import notification as crud_notification
from app.schemas.notification import NotificationCreate
from app.models.notification import NotificationType, NotificationChannel

async def send_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: NotificationType = NotificationType.SYSTEM,
    channel: NotificationChannel = NotificationChannel.IN_APP,
    order_id: int = None
):
    """
    Sends a notification to a user.
    1. Creates a database record.
    2. Emits a Socket.IO event.
    3. Mocks sending SMS/Push if applicable.
    """
    print(f"Sending notification to user {user_id}: {title} - {message} ({channel})")

    # 1. Create DB Record
    notification = crud_notification.create(db, obj_in=NotificationCreate(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        channel=channel,
        order_id=order_id
    ))
    # 2. Emit Socket.IO Event (via the live Flask-SocketIO server, when running)
    # The legacy async server (app/core/socket.py) was removed — emit through
    # the Flask-SocketIO instance instead, if it has been initialized.
    try:
        from extensions import socketio as flask_sio
        flask_sio.emit('notification', {
            'id': notification.id,
            'title': title,
            'message': message,
            'type': type.value if hasattr(type, 'value') else str(type)
        }, room=f"user_{user_id}")
    except Exception as emit_err:
        print(f"[notifications] socket emit skipped (no live server): {emit_err}")
    # 3. Mock External Provider
    if channel == NotificationChannel.SMS:
        print(f"[MOCK SMS] To User {user_id}: {message}")
    elif channel == NotificationChannel.PUSH:
        print(f"[MOCK PUSH] To User {user_id}: {title} - {message}")
        
    return notification
