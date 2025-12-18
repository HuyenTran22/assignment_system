from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.models.course import CourseRole


# Course Schemas
class CourseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None


class CourseResponse(CourseBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    enrollment_count: Optional[int] = 0
    assignment_count: Optional[int] = 0
    
    model_config = ConfigDict(from_attributes=True)


# Course Enrollment Schemas
class EnrollmentCreate(BaseModel):
    user_id: UUID
    role: str  # Accept 'STUDENT' or 'TEACHER' from frontend, will be converted to CourseRole


class UserInfo(BaseModel):
    id: UUID
    full_name: str
    email: str
    student_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class EnrollmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    role_in_course: CourseRole
    enrolled_at: datetime
    user: Optional[UserInfo] = None
    
    model_config = ConfigDict(from_attributes=True)


# Pagination
class PaginatedResponse(BaseModel):
    items: List[CourseResponse]
    total: int
    page: int
    limit: int
    pages: int
