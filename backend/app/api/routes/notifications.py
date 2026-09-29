from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.analytics import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/me")
def my_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()


@router.put("/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"detail": "Marked as read"}
