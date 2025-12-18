from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal


# Grade Schemas
class GradeCreate(BaseModel):
    score: Decimal = Field(..., ge=0, le=100)
    feedback_text: Optional[str] = None


class GradeUpdate(BaseModel):
    score: Optional[Decimal] = Field(None, ge=0, le=100)
    feedback_text: Optional[str] = None


class GradeResponse(BaseModel):
    id: UUID
    submission_id: UUID
    grader_id: UUID
    score: Decimal
    feedback_text: Optional[str]
    graded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# For student view with assignment info
class GradeWithAssignmentResponse(GradeResponse):
    assignment: dict  # {id, title, due_at}
    submission: dict  # {id, submitted_at, status}
