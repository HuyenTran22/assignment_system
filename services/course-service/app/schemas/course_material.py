from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Union
from datetime import datetime
from uuid import UUID

from app.models.course_material import MaterialType


class CourseModuleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    order_index: int = 0


class CourseModuleCreate(CourseModuleBase):
    course_id: UUID


class CourseModuleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    order_index: Optional[int] = None


class CourseModuleResponse(CourseModuleBase):
    id: UUID
    course_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CourseMaterialBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    type: MaterialType
    description: Optional[str] = None
    content: Optional[str] = None  # For lesson type
    file_path: Optional[str] = None  # For video/document
    video_url: Optional[str] = None  # For external video
    order_index: int = 0
    
    @field_validator('type', mode='before')
    @classmethod
    def normalize_material_type(cls, v):
        """Normalize material type to lowercase enum value"""
        if isinstance(v, MaterialType):
            return v
        if isinstance(v, str):
            # Normalize to lowercase and try to match enum value
            v_lower = v.lower()
            # Try to find matching enum by value
            for enum_item in MaterialType:
                if enum_item.value == v_lower:
                    return enum_item
            # If not found, try to match by name (case-insensitive)
            for enum_item in MaterialType:
                if enum_item.name.upper() == v.upper():
                    return enum_item
            # If still not found, raise error
            valid_values = [e.value for e in MaterialType]
            raise ValueError(f"Invalid material type: {v}. Valid types are: {valid_values}")
        return v


class CourseMaterialCreate(CourseMaterialBase):
    course_id: UUID  # Frontend sends this, but backend uses path parameter
    module_id: Optional[UUID] = None


class CourseMaterialUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    content: Optional[str] = None
    file_path: Optional[str] = None
    video_url: Optional[str] = None
    module_id: Optional[UUID] = None
    order_index: Optional[int] = None


class CourseMaterialResponse(CourseMaterialBase):
    id: UUID
    course_id: UUID
    module_id: Optional[UUID] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserCourseProgressResponse(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    module_id: Optional[UUID] = None
    material_id: Optional[UUID] = None
    completed_at: Optional[datetime] = None
    progress_percentage: int
    
    model_config = ConfigDict(from_attributes=True)

