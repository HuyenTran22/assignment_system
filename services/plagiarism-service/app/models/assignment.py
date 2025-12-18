import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class Assignment(Base):
    __tablename__ = "assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    due_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    allow_late_submission = Column(Boolean, default=False)
    allow_peer_review = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships (Course is read-only, no back_populates)
    course = relationship("Course")
    creator = relationship("User", foreign_keys=[created_by])
    files = relationship("AssignmentFile", back_populates="assignment", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")


class AssignmentFile(Base):
    __tablename__ = "assignment_files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_size = Column(Integer)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    assignment = relationship("Assignment", back_populates="files")
