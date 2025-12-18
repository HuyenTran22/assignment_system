"""
Course material models - consolidated from course-service
"""
import uuid
import enum
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, TypeDecorator
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class MaterialType(str, enum.Enum):
    LESSON = "lesson"
    VIDEO = "video"
    DOCUMENT = "document"


class MaterialTypeColumn(TypeDecorator):
    """Custom TypeDecorator for MaterialType enum"""
    impl = String
    cache_ok = True
    
    def __init__(self, length=50):
        super().__init__(length=length)
    
    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, MaterialType):
            return value.value
        if isinstance(value, str):
            valid_values = [e.value for e in MaterialType]
            if value.lower() in valid_values:
                return value.lower()
            for enum_item in MaterialType:
                if enum_item.name.upper() == value.upper():
                    return enum_item.value
            raise ValueError(f"Invalid material type: {value}")
        return str(value)
    
    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, MaterialType):
            return value
        for enum_item in MaterialType:
            if enum_item.value == value.lower():
                return enum_item
        for enum_item in MaterialType:
            if enum_item.name.upper() == value.upper():
                return enum_item
        return value


class CourseMaterial(Base):
    __tablename__ = "course_materials"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id = Column(UUID(as_uuid=True), ForeignKey("course_modules.id", ondelete="CASCADE"), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    type = Column(MaterialTypeColumn(length=50), nullable=False)
    description = Column(Text, nullable=True)
    
    content = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    
    order_index = Column(Integer, nullable=False, default=0)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="materials")
    module = relationship("CourseModule", back_populates="materials")


class UserCourseProgress(Base):
    __tablename__ = "user_course_progress"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id = Column(UUID(as_uuid=True), ForeignKey("course_modules.id", ondelete="CASCADE"), nullable=True, index=True)
    material_id = Column(UUID(as_uuid=True), ForeignKey("course_materials.id", ondelete="CASCADE"), nullable=True, index=True)
    
    completed_at = Column(DateTime(timezone=True), nullable=True)
    progress_percentage = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
