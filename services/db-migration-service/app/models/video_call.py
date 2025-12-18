"""
Video call models - consolidated from course-service
"""
import uuid
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class VideoCallStatus(str, enum.Enum):
    idle = "idle"
    active = "active"
    ended = "ended"


class VideoCallRoom(Base):
    __tablename__ = "video_call_rooms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    room_name = Column(String(255), nullable=False)
    room_url = Column(String(500))
    status = Column(String(20), default=VideoCallStatus.idle.value, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    max_participants = Column(Integer, default=50)
    started_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="video_call_room")
    participants = relationship("VideoCallParticipant", back_populates="room", cascade="all, delete-orphan")


class VideoCallParticipant(Base):
    __tablename__ = "video_call_participants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("video_call_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    left_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    room = relationship("VideoCallRoom", back_populates="participants")
