import uuid
from sqlalchemy import Column, String, Enum as SQLEnum, DateTime, Boolean, Integer, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.db import Base


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    MANAGER = "MANAGER"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole, name='userrole', create_type=False), nullable=False, index=True)

    
    # Admin features
    student_id = Column(String(50), unique=True, nullable=True)
    class_name = Column(String(100), nullable=True)
    must_change_password = Column(Boolean, default=True, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    last_password_change = Column(TIMESTAMP, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    password_history = relationship("PasswordHistory", back_populates="user", cascade="all, delete-orphan")
    created_users = relationship("User", remote_side=[id])
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

