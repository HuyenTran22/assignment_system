import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Numeric, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class PlagiarismMatch(Base):
    __tablename__ = "plagiarism_matches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    submission1_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    submission2_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    similarity_score = Column(Numeric(5, 2), nullable=False, index=True)
    checked_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    assignment = relationship("Assignment")
    submission1 = relationship("Submission", foreign_keys=[submission1_id])
    submission2 = relationship("Submission", foreign_keys=[submission2_id])
    
    # Constraints
    __table_args__ = (
        CheckConstraint('submission1_id < submission2_id', name='check_submission_order'),
    )
