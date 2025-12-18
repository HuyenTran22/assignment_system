import uuid
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db import Base


class CourseRole(str, enum.Enum):
    student = "student"
    teacher = "teacher"


class Course(Base):
    """
    Course model - Read-only for assignment-service.
    This is a read-only model to query courses from shared database.
    """
    __tablename__ = "courses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CourseEnrollment(Base):
    """
    CourseEnrollment model - Read-only for assignment-service.
    """
    __tablename__ = "course_enrollments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    role_in_course = Column(SQLEnum(CourseRole), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())

