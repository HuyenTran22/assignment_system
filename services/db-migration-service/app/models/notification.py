"""
Notification model - consolidated from notification-service
"""
import uuid
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class NotificationType(str, enum.Enum):
    GRADE = "GRADE"
    SUBMISSION = "SUBMISSION"
    PEER_REVIEW = "PEER_REVIEW"
    ASSIGNMENT_CREATED = "ASSIGNMENT_CREATED"
    QUIZ_CREATED = "QUIZ_CREATED"
    DISCUSSION_REPLY = "DISCUSSION_REPLY"
    DEADLINE_REMINDER = "DEADLINE_REMINDER"


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(SQLEnum(NotificationType, name='notificationtype', create_type=True), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
