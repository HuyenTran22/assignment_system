import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class Rubric(Base):
    __tablename__ = "rubrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    assignment = relationship("Assignment", back_populates="rubric")
    items = relationship("RubricItem", back_populates="rubric", cascade="all, delete-orphan", order_by="RubricItem.order_index")


class RubricItem(Base):
    __tablename__ = "rubric_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rubric_id = Column(UUID(as_uuid=True), ForeignKey("rubrics.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(Text, nullable=False)
    max_score = Column(Numeric(5, 2), nullable=False)
    weight = Column(Numeric(5, 2), default=1.0)
    order_index = Column(Integer, nullable=False)
    
    # Relationships
    rubric = relationship("Rubric", back_populates="items")
    scores = relationship("RubricScore", back_populates="rubric_item", cascade="all, delete-orphan")


class RubricScore(Base):
    __tablename__ = "rubric_scores"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rubric_item_id = Column(UUID(as_uuid=True), ForeignKey("rubric_items.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Numeric(5, 2), nullable=False)
    comment = Column(Text)
    scored_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    rubric_item = relationship("RubricItem", back_populates="scores")
    submission = relationship("Submission", back_populates="rubric_scores")
