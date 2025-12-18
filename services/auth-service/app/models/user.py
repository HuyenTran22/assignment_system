import uuid
import enum
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db import Base


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    MANAGER = "MANAGER"
    ADMIN = "ADMIN"


class User(Base):
    """
    User model - Read-only for auth-service.
    """
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole, name='userrole', create_type=False), nullable=False, default=UserRole.STUDENT)

    student_id = Column(String(50), nullable=True, unique=True, index=True)
    class_name = Column(String(100), nullable=True)
    must_change_password = Column(Boolean, default=False, nullable=False)
    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

