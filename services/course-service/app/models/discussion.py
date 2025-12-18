import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class DiscussionThread(Base):
    __tablename__ = "discussion_threads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    
    view_count = Column(Integer, default=0)
    reply_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="discussion_threads")
    author = relationship("User")
    replies = relationship("DiscussionReply", back_populates="thread", cascade="all, delete-orphan", order_by="DiscussionReply.created_at")


class DiscussionReply(Base):
    __tablename__ = "discussion_replies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("discussion_threads.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    parent_reply_id = Column(UUID(as_uuid=True), ForeignKey("discussion_replies.id", ondelete="CASCADE"), nullable=True)
    
    content = Column(Text, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    thread = relationship("DiscussionThread", back_populates="replies")
    author = relationship("User", foreign_keys=[user_id])
    parent_reply = relationship("DiscussionReply", remote_side=[id], backref="child_replies")

