from sqlalchemy.orm import Session
from app.crud.notification import notification as crud_notification
from app.schemas.notification import NotificationCreate
from app.models.notification import NotificationType, NotificationChannel
from app.core.socket import sio

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
    
    # 2. Emit Socket.IO Event
    # We broadcast to the specific user room if we have a pattern like 'user_{id}'
    # In socket.py we joined 'tracking_courier_{id}', let's assume we might have 'user_{id}' too 
    # or just emit to 'tracking_courier_{id}' if it's a courier.
    # For now, let's try to emit to 'user_{user_id}' and also 'tracking_courier_{user_id}' just in case.
    await sio.emit('notification', {
        'id': notification.id,
        'title': title,
        'message': message,
        'type': type.value if hasattr(type, 'value') else str(type)
    }, room=f"user_{user_id}")
    
    # 3. Mock External Provider
    if channel == NotificationChannel.SMS:
        print(f"[MOCK SMS] To User {user_id}: {message}")
    elif channel == NotificationChannel.PUSH:
        print(f"[MOCK PUSH] To User {user_id}: {title} - {message}")
        
    return notification
