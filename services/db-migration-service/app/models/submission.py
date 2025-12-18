"""
Submission models - consolidated from submission-service
"""
import uuid
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class SubmissionStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    LATE = "LATE"
    RESUBMITTED = "RESUBMITTED"


class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(SQLEnum(SubmissionStatus, name='submissionstatus', create_type=True), nullable=False, index=True)
    comment = Column(Text)
    plagiarism_score = Column(Numeric(5, 2))
    
    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    files = relationship("SubmissionFile", back_populates="submission", cascade="all, delete-orphan")
    grade = relationship("Grade", back_populates="submission", uselist=False)
    peer_reviews = relationship("PeerReview", back_populates="submission", cascade="all, delete-orphan")


class SubmissionFile(Base):
    __tablename__ = "submission_files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_size = Column(Integer)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    submission = relationship("Submission", back_populates="files")
