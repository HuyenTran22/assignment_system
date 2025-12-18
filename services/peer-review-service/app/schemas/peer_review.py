from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal


# Peer Review Schemas
class PeerReviewCreate(BaseModel):
    score: Optional[Decimal] = Field(None, ge=0, le=100)
    feedback: str = Field(..., min_length=1)


class PeerReviewResponse(BaseModel):
    id: UUID
    submission_id: UUID
    reviewer_id: UUID
    score: Optional[Decimal]
    feedback: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# For student view with submission info
class PeerReviewTaskResponse(BaseModel):
    submission_id: UUID
    assignment: dict  # {id, title}
    student: dict  # {id, full_name}
    submitted_at: str  # ISO datetime string
    review_status: str  # "pending" | "completed"
    files: list  # List of submission files
    review: Optional[dict] = None  # {score, feedback} if completed


# For viewing received reviews
class ReceivedPeerReviewResponse(BaseModel):
    id: UUID
    submission_id: UUID
    reviewer_id: UUID
    score: Optional[Decimal]
    feedback: str
    created_at: datetime
    assignment: dict  # {id, title}
    reviewer: dict  # {id, full_name, email}
