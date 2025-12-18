import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Enum as SQLEnum, TypeDecorator
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.db import Base


class MaterialType(str, enum.Enum):
    LESSON = "lesson"  # Text-based lesson
    VIDEO = "video"    # Video file or YouTube URL
    DOCUMENT = "document"  # PDF, DOCX, PPTX, etc.


class MaterialTypeColumn(TypeDecorator):
    """Custom TypeDecorator to ensure enum value (not name) is saved to database"""
    impl = String
    cache_ok = True
    
    def __init__(self, length=50):
        super().__init__(length=length)
    
    def process_bind_param(self, value, dialect):
        """Convert enum instance to its value (string) before saving"""
        if value is None:
            return None
        if isinstance(value, MaterialType):
            return value.value  # Return enum value, not name
        if isinstance(value, str):
            # Validate it's a valid enum value
            valid_values = [e.value for e in MaterialType]
            if value.lower() in valid_values:
                return value.lower()
            # Try to match by enum name and return value
            for enum_item in MaterialType:
                if enum_item.name.upper() == value.upper():
                    return enum_item.value
            raise ValueError(f"Invalid material type: {value}")
        return str(value)
    
    def process_result_value(self, value, dialect):
        """Convert string from database to enum instance"""
        if value is None:
            return None
        if isinstance(value, MaterialType):
            return value
        # Try to find enum by value
        for enum_item in MaterialType:
            if enum_item.value == value.lower():
                return enum_item
        # Fallback: try to find by name
        for enum_item in MaterialType:
            if enum_item.name.upper() == value.upper():
                return enum_item
        return value


class CourseModule(Base):
    __tablename__ = "course_modules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="modules")
    materials = relationship("CourseMaterial", back_populates="module", cascade="all, delete-orphan", order_by="CourseMaterial.order_index")


class CourseMaterial(Base):
    __tablename__ = "course_materials"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id = Column(UUID(as_uuid=True), ForeignKey("course_modules.id", ondelete="CASCADE"), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    type = Column(MaterialTypeColumn(length=50), nullable=False)
    description = Column(Text, nullable=True)
    
    # Content based on type
    content = Column(Text, nullable=True)  # For lesson type (markdown/HTML)
    file_path = Column(String(500), nullable=True)  # For video/document (file path)
    video_url = Column(String(500), nullable=True)  # For external video (YouTube/Vimeo URL)
    
    order_index = Column(Integer, nullable=False, default=0)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="materials")
    module = relationship("CourseModule", back_populates="materials")
    creator = relationship("User")


class UserCourseProgress(Base):
    __tablename__ = "user_course_progress"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id = Column(UUID(as_uuid=True), ForeignKey("course_modules.id", ondelete="CASCADE"), nullable=True, index=True)
    material_id = Column(UUID(as_uuid=True), ForeignKey("course_materials.id", ondelete="CASCADE"), nullable=True, index=True)
    
    completed_at = Column(DateTime(timezone=True), nullable=True)
    progress_percentage = Column(Integer, default=0)  # 0-100
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Unique constraint: one progress record per user-material
    __table_args__ = (
        {"schema": None},
    )

