from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.models.submission import SubmissionStatus


# Submission File Schemas
class SubmissionFileResponse(BaseModel):
    id: UUID
    file_path: str
    original_name: str
    file_size: Optional[int]
    uploaded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Submission Schemas
class SubmissionCreate(BaseModel):
    comment: Optional[str] = None


class SubmissionResponse(BaseModel):
    id: UUID
    assignment_id: UUID
    student_id: UUID
    submitted_at: datetime
    status: SubmissionStatus
    comment: Optional[str]
    plagiarism_score: Optional[float]
    files: List[SubmissionFileResponse] = []
    
    model_config = ConfigDict(from_attributes=True)


# For teacher view with student info
class SubmissionWithStudentResponse(SubmissionResponse):
    student: Optional[dict] = None  # {id, full_name, email}
    grade: Optional[dict] = None  # {score, graded_at}
    files: List[dict] = []  # [{id, original_name, file_size}]


# Pagination
class PaginatedSubmissionResponse(BaseModel):
    items: List[SubmissionWithStudentResponse]
    total: int
    page: int
    limit: int
    pages: int
