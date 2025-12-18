"""
Quiz models - consolidated from course-service
"""
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    max_attempts = Column(Integer, default=1, nullable=False)
    passing_score = Column(Float, default=60.0, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)
    shuffle_questions = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    due_date = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    course = relationship("Course", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan", order_by="QuizQuestion.order_index")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False)
    options = Column(JSON, nullable=True)
    correct_answer = Column(Text, nullable=False)
    points = Column(Float, default=1.0, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    explanation = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    quiz = relationship("Quiz", back_populates="questions")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    score = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    is_passed = Column(Boolean, nullable=True)
    time_taken_seconds = Column(Integer, nullable=True)
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    quiz = relationship("Quiz", back_populates="attempts")
    answers = relationship("QuizAnswer", back_populates="attempt", cascade="all, delete-orphan")


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id = Column(UUID(as_uuid=True), ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("quiz_questions.id"), nullable=False)
    
    answer_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=True)
    points_earned = Column(Float, default=0.0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    attempt = relationship("QuizAttempt", back_populates="answers")
