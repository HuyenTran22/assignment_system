from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class LiveSessionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    meeting_url: Optional[str] = None
    meeting_id: Optional[str] = None
    meeting_password: Optional[str] = None
    scheduled_start: datetime
    scheduled_end: datetime
    max_participants: Optional[int] = Field(None, ge=1)
    is_recorded: bool = False
    extra_data: Optional[Dict[str, Any]] = None


class LiveSessionCreate(LiveSessionBase):
    course_id: UUID


class LiveSessionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    meeting_url: Optional[str] = None
    meeting_id: Optional[str] = None
    meeting_password: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    max_participants: Optional[int] = Field(None, ge=1)
    is_recorded: Optional[bool] = None
    status: Optional[str] = Field(None, pattern="^(scheduled|ongoing|completed|cancelled)$")
    extra_data: Optional[Dict[str, Any]] = None


class LiveSessionResponse(LiveSessionBase):
    id: UUID
    course_id: UUID
    created_by: UUID
    status: str
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    creator_name: Optional[str] = None
    attendance_count: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class SessionAttendanceBase(BaseModel):
    session_id: UUID
    user_id: UUID


class SessionAttendanceResponse(SessionAttendanceBase):
    id: UUID
    joined_at: datetime
    left_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    user_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class SessionRecordingBase(BaseModel):
    recording_url: str
    recording_type: str = "video"
    file_size_bytes: Optional[int] = None
    duration_seconds: Optional[int] = None


class SessionRecordingCreate(SessionRecordingBase):
    session_id: UUID


class SessionRecordingResponse(SessionRecordingBase):
    id: UUID
    session_id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class LiveSessionDetailResponse(LiveSessionResponse):
    attendance: List[SessionAttendanceResponse] = []
    recordings: List[SessionRecordingResponse] = []

