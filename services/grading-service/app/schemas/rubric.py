from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal


# Rubric Item Schemas
class RubricItemCreate(BaseModel):
    description: str = Field(..., min_length=1)
    max_score: Decimal = Field(..., ge=0, le=100)
    weight: Decimal = Field(default=Decimal("1.0"), ge=0)
    order_index: int = Field(..., ge=0)


class RubricItemResponse(BaseModel):
    id: UUID
    description: str
    max_score: Decimal
    weight: Decimal
    order_index: int
    
    model_config = ConfigDict(from_attributes=True)


# Rubric Schemas
class RubricCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    items: List[RubricItemCreate]


class RubricResponse(BaseModel):
    id: UUID
    assignment_id: UUID
    title: str
    created_at: datetime
    items: List[RubricItemResponse] = []
    
    model_config = ConfigDict(from_attributes=True)


# Rubric Score Schemas
class RubricScoreCreate(BaseModel):
    rubric_item_id: UUID
    score: Decimal = Field(..., ge=0)
    comment: Optional[str] = None


class RubricScoreResponse(BaseModel):
    id: UUID
    rubric_item_id: UUID
    submission_id: UUID
    score: Decimal
    comment: Optional[str]
    scored_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# For grading with rubric
class RubricGradingRequest(BaseModel):
    scores: List[RubricScoreCreate]


class RubricGradingResponse(BaseModel):
    submission_id: UUID
    rubric_scores: List[RubricScoreResponse]
    total_score: Decimal
    grade_id: UUID
