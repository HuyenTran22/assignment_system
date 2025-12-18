"""
Course models - consolidated from course-service
"""
import uuid
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class CourseRole(str, enum.Enum):
    student = "student"
    teacher = "teacher"


class Course(Base):
    __tablename__ = "courses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    enrollments = relationship("CourseEnrollment", back_populates="course", cascade="all, delete-orphan")
    modules = relationship("CourseModule", back_populates="course", cascade="all, delete-orphan", order_by="CourseModule.order_index")
    materials = relationship("CourseMaterial", back_populates="course", cascade="all, delete-orphan", order_by="CourseMaterial.order_index")
    quizzes = relationship("Quiz", back_populates="course", cascade="all, delete-orphan")
    live_sessions = relationship("LiveSession", back_populates="course", cascade="all, delete-orphan", order_by="LiveSession.scheduled_start")
    video_call_room = relationship("VideoCallRoom", back_populates="course", uselist=False, cascade="all, delete-orphan")
    discussion_threads = relationship("DiscussionThread", back_populates="course", cascade="all, delete-orphan")


class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    role_in_course = Column(SQLEnum(CourseRole, name='courserole', create_type=True), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="enrollments")


class CourseModule(Base):
    __tablename__ = "course_modules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="modules")
    materials = relationship("CourseMaterial", back_populates="module", cascade="all, delete-orphan")
