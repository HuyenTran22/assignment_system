from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import math

from app.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationResponse,
    NotificationCreate,
    PaginatedNotificationResponse
)
from app.services.email_service import send_email, create_notification_email_html

router = APIRouter()


@router.get("", response_model=PaginatedNotificationResponse)
def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    is_read: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List notifications for current user.
    
    - **is_read**: Filter by read status
    - **page**: Page number
    - **limit**: Items per page
    """
    print(f"[Notification] Received request for user {current_user.id}")  # DEBUG
    
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    # Filter by read status
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    
    # Get total and unread count
    total = query.count()
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    # Pagination
    offset = (page - 1) * limit
    notifications = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
    
    return PaginatedNotificationResponse(
        items=notifications,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 0,
        unread_count=unread_count
    )


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    
    return notification


@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read."""
    updated_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    
    return {"updated_count": updated_count}


@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_notifications(
    notification_data: NotificationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Create notifications for multiple users (used by other services).
    Optionally sends email notifications.
    """
    created_notifications = []
    user_emails = []
    
    # Create notification for each user
    for user_id in notification_data.user_ids:
        # Check if user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            continue
        
        # Create notification
        notification = Notification(
            user_id=user_id,
            type=notification_data.type,
            title=notification_data.title,
            message=notification_data.message,
            is_read=False
        )
        db.add(notification)
        created_notifications.append(notification)
        
        # Collect user emails for email sending
        if notification_data.send_email:
            user_emails.append(user.email)
    
    db.commit()
    
    # Send emails in background if requested
    if notification_data.send_email and user_emails:
        html_content = create_notification_email_html(
            title=notification_data.title,
            message=notification_data.message,
            action_url=notification_data.action_url
        )
        background_tasks.add_task(
            send_email,
            to_emails=user_emails,
            subject=notification_data.title,
            html_content=html_content,
            plain_content=notification_data.message
        )
    
    return {
        "created_count": len(created_notifications),
        "email_sent": notification_data.send_email and len(user_emails) > 0
    }
