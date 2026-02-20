from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum as PgEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.db import Base

class NotificationType(str, enum.Enum):
    ORDER_STATUS = "order_status"
    SYSTEM = "system"
    PROMOTION = "promotion"
    ALERT = "alert"

class NotificationChannel(str, enum.Enum):
    IN_APP = "in_app"
    SMS = "sms"
    PUSH = "push"
    EMAIL = "email"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    
    type = Column(PgEnum(NotificationType), default=NotificationType.SYSTEM, nullable=False)
    channel = Column(PgEnum(NotificationChannel), default=NotificationChannel.IN_APP, nullable=False)
    
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", backref="notifications")
    order = relationship("Order", backref="notifications")
