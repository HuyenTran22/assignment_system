from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# Assignment File Schemas
class AssignmentFileResponse(BaseModel):
    id: UUID
    file_path: str
    original_name: str
    file_size: Optional[int]
    uploaded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Assignment Schemas
class AssignmentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    due_at: datetime
    allow_late_submission: bool = False
    allow_peer_review: bool = False
    enable_plagiarism_check: bool = True


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    due_at: Optional[datetime] = None
    allow_late_submission: Optional[bool] = None
    allow_peer_review: Optional[bool] = None
    enable_plagiarism_check: Optional[bool] = None


class AssignmentResponse(AssignmentBase):
    id: UUID
    course_id: UUID
    created_by: UUID
    created_at: datetime
    files: List[AssignmentFileResponse] = []
    submission_count: Optional[int] = 0
    graded_count: Optional[int] = 0
    my_submission: Optional[dict] = None  # For student view
    course: Optional[dict] = None  # {id, name, code} - populated by API
    
    model_config = ConfigDict(from_attributes=True)


# Pagination
class PaginatedAssignmentResponse(BaseModel):
    items: List[AssignmentResponse]
    total: int
    page: int
    limit: int
    pages: int
