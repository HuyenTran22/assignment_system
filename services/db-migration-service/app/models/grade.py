"""
Grade model - consolidated from grading-service
"""
import uuid
from sqlalchemy import Column, Text, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class Grade(Base):
    __tablename__ = "grades"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    grader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    score = Column(Numeric(5, 2), nullable=False)
    feedback_text = Column(Text)
    graded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    submission = relationship("Submission", back_populates="grade")
