from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User as UserModel
from app.schemas.notification import Notification, NotificationCreate, NotificationType, NotificationChannel
from app.crud.notification import notification as crud_notification
from app.core.notifications import send_notification

router = APIRouter()

@router.get("/", response_model=List[Notification])
def read_notifications(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve notifications for current user.
    """
    notifications = crud_notification.get_multi_by_user(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return notifications

@router.put("/{id}/read", response_model=Notification)
def mark_notification_read(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Mark a notification as read.
    """
    notification = crud_notification.get(db, id=id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    notification = crud_notification.mark_as_read(db, db_obj=notification)
    return notification

@router.post("/test", response_model=Notification)
async def test_notification(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    message: str = "Test notification",
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Send a test notification (Admin only).
    """
    notification = await send_notification(
        db, 
        user_id=user_id, 
        title="Test Notification", 
        message=message,
        type=NotificationType.SYSTEM,
        channel=NotificationChannel.IN_APP
    )
    return notification
