from pydantic import BaseModel, ConfigDict
from typing import List
from datetime import datetime
from uuid import UUID
from decimal import Decimal


# Plagiarism Match Schemas
class PlagiarismMatchResponse(BaseModel):
    id: UUID
    submission1_id: UUID
    submission2_id: UUID
    similarity_score: Decimal
    checked_at: datetime
    student1: dict  # {id, full_name}
    student2: dict  # {id, full_name}
    
    model_config = ConfigDict(from_attributes=True)


# Plagiarism Report
class PlagiarismReportResponse(BaseModel):
    assignment_id: UUID
    total_submissions: int
    total_comparisons: int
    matches: List[PlagiarismMatchResponse]
    high_similarity_count: int  # > 70%
    medium_similarity_count: int  # 50-70%
