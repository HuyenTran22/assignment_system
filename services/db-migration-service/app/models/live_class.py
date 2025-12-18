"""
Live class models - consolidated from course-service
"""
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class LiveSession(Base):
    __tablename__ = "live_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    meeting_url = Column(String(500), nullable=True)
    meeting_id = Column(String(255), nullable=True)
    meeting_password = Column(String(100), nullable=True)
    
    scheduled_start = Column(DateTime(timezone=True), nullable=False, index=True)
    scheduled_end = Column(DateTime(timezone=True), nullable=False)
    actual_start = Column(DateTime(timezone=True), nullable=True)
    actual_end = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(String(50), default="scheduled", nullable=False)
    is_recorded = Column(Boolean, default=False, nullable=False)
    max_participants = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    extra_data = Column(JSON, nullable=True)
    
    # Relationships
    course = relationship("Course", back_populates="live_sessions")
    attendance = relationship("SessionAttendance", back_populates="session", cascade="all, delete-orphan")
    recordings = relationship("SessionRecording", back_populates="session", cascade="all, delete-orphan")


class SessionAttendance(Base):
    __tablename__ = "session_attendance"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("live_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    left_at = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    
    # Relationships
    session = relationship("LiveSession", back_populates="attendance")


class SessionRecording(Base):
    __tablename__ = "session_recordings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("live_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    recording_url = Column(String(500), nullable=False)
    recording_type = Column(String(50), default="video", nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("LiveSession", back_populates="recordings")
