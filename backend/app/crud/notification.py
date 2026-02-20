from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationUpdate

class CRUDNotification:
    def get(self, db: Session, id: int):
        return db.query(Notification).filter(Notification.id == id).first()

    def get_multi_by_user(self, db: Session, user_id: int, skip: int = 0, limit: int = 100):
        return db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
        
    def get_unread_count(self, db: Session, user_id: int) -> int:
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

    def create(self, db: Session, obj_in: NotificationCreate):
        db_obj = Notification(
            user_id=obj_in.user_id,
            order_id=obj_in.order_id,
            title=obj_in.title,
            message=obj_in.message,
            type=obj_in.type,
            channel=obj_in.channel
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def mark_as_read(self, db: Session, db_obj: Notification):
        db_obj.is_read = True
        db_obj.read_at = datetime.utcnow()
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def mark_all_as_read(self, db: Session, user_id: int):
        # Update all unread
        db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({
            Notification.is_read: True,
            Notification.read_at: datetime.utcnow()
        }, synchronize_session=False)
        db.commit()

notification = CRUDNotification()
