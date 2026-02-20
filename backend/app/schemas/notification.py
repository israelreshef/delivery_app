from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.notification import NotificationType, NotificationChannel

class NotificationBase(BaseModel):
    title: str
    message: str
    type: Optional[NotificationType] = NotificationType.SYSTEM
    channel: Optional[NotificationChannel] = NotificationChannel.IN_APP
    order_id: Optional[int] = None

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

class Notification(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
