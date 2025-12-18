from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# Quiz Schemas
class QuizBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    start_time: Optional[datetime] = None  # When quiz becomes available
    end_time: Optional[datetime] = None  # When quiz closes
    max_attempts: int = Field(1, ge=1)
    passing_score: float = Field(60.0, ge=0, le=100)
    is_published: bool = False
    shuffle_questions: bool = False
    due_date: Optional[datetime] = None  # Deprecated, use end_time instead


class QuizCreate(QuizBase):
    course_id: UUID


class QuizUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_attempts: Optional[int] = Field(None, ge=1)
    passing_score: Optional[float] = Field(None, ge=0, le=100)
    is_published: Optional[bool] = None
    shuffle_questions: Optional[bool] = None
    due_date: Optional[datetime] = None  # Deprecated


class QuizResponse(QuizBase):
    id: UUID
    course_id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    question_count: Optional[int] = None
    creator_name: Optional[str] = None
    user_attempt_count: Optional[int] = None  # Number of submitted attempts by current user
    has_submitted: Optional[bool] = None  # Whether user has submitted at least one attempt
    
    model_config = ConfigDict(from_attributes=True)


# Quiz Question Schemas
class QuizQuestionBase(BaseModel):
    question_text: str = Field(..., min_length=1)
    question_type: str = Field(..., pattern="^(multiple_choice|true_false|short_answer)$")
    options: Optional[List[str]] = None  # For multiple choice
    correct_answer: str = Field(..., min_length=1)
    points: float = Field(1.0, ge=0)
    order_index: int = Field(0, ge=0)
    explanation: Optional[str] = None


class QuizQuestionCreate(QuizQuestionBase):
    quiz_id: UUID


class QuizQuestionUpdate(BaseModel):
    question_text: Optional[str] = Field(None, min_length=1)
    question_type: Optional[str] = Field(None, pattern="^(multiple_choice|true_false|short_answer)$")
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = Field(None, min_length=1)
    points: Optional[float] = Field(None, ge=0)
    order_index: Optional[int] = Field(None, ge=0)
    explanation: Optional[str] = None


class QuizQuestionResponse(BaseModel):
    id: UUID
    quiz_id: UUID
    question_text: str
    question_type: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None  # Optional to hide from students
    points: float
    order_index: int
    explanation: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Quiz Attempt Schemas
class QuizAttemptStart(BaseModel):
    quiz_id: UUID


class QuizAttemptResponse(BaseModel):
    id: UUID
    quiz_id: UUID
    user_id: UUID
    score: Optional[float] = None
    percentage: Optional[float] = None
    is_passed: Optional[bool] = None
    time_taken_seconds: Optional[int] = None
    started_at: datetime
    submitted_at: Optional[datetime] = None
    user_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


# Quiz Answer Schemas
class QuizAnswerSubmit(BaseModel):
    question_id: UUID
    answer_text: str = Field(..., min_length=1)


class QuizSubmitRequest(BaseModel):
    answers: List[QuizAnswerSubmit]


class QuizAnswerResponse(BaseModel):
    id: UUID
    attempt_id: UUID
    question_id: UUID
    answer_text: str
    is_correct: Optional[bool] = None
    points_earned: float
    created_at: datetime
    question: Optional[QuizQuestionResponse] = None
    
    model_config = ConfigDict(from_attributes=True)


class QuizAttemptDetailResponse(QuizAttemptResponse):
    answers: List[QuizAnswerResponse] = []
    quiz: Optional[QuizResponse] = None


class QuizWithQuestionsResponse(QuizResponse):
    questions: List[QuizQuestionResponse] = []


class QuizAttemptWithQuestions(QuizAttemptResponse):
    quiz: Optional[QuizWithQuestionsResponse] = None
    answers: List[QuizAnswerResponse] = []


# Student Quiz Status Schema
class StudentQuizStatus(BaseModel):
    user_id: UUID
    user_name: str
    student_id: Optional[str] = None
    email: str
    has_attempted: bool  # Whether student has started any attempt
    has_submitted: bool  # Whether student has submitted at least one attempt
    attempt_count: int  # Number of submitted attempts
    best_score: Optional[float] = None  # Best score achieved
    best_percentage: Optional[float] = None  # Best percentage achieved
    latest_attempt_date: Optional[datetime] = None  # Date of latest submitted attempt
    is_passed: Optional[bool] = None  # Whether best attempt passed

