from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.models.notification import NotificationType


# Notification Schemas
class NotificationResponse(BaseModel):
    id: UUID
    type: NotificationType
    title: str
    message: str
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class NotificationCreate(BaseModel):
    user_ids: List[UUID]
    type: NotificationType
    title: str
    message: str
    send_email: bool = False
    action_url: Optional[str] = None


# Pagination
class PaginatedNotificationResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    page: int
    limit: int
    pages: int
    unread_count: int
