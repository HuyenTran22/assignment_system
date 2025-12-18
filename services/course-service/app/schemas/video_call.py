from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class VideoCallRoomBase(BaseModel):
    course_id: UUID
    room_name: Optional[str] = None
    is_locked: bool = False
    max_participants: int = 50


class VideoCallRoomCreate(VideoCallRoomBase):
    pass


class VideoCallRoomUpdate(BaseModel):
    is_locked: Optional[bool] = None
    max_participants: Optional[int] = None


class VideoCallParticipantInfo(BaseModel):
    id: UUID
    user_id: UUID
    user_name: str
    user_email: str
    joined_at: datetime
    left_at: Optional[datetime] = None
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)


class VideoCallRoomResponse(BaseModel):
    id: UUID
    course_id: UUID
    room_name: str
    room_url: str
    status: str
    is_locked: bool
    max_participants: int
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    participant_count: int = 0
    active_participants: List[VideoCallParticipantInfo] = []
    
    model_config = ConfigDict(from_attributes=True)


class VideoCallJoinResponse(BaseModel):
    room: VideoCallRoomResponse
    jitsi_url: str
    token: Optional[str] = None  # JWT token nếu cần authentication


class VideoCallParticipantResponse(BaseModel):
    id: UUID
    room_id: UUID
    user_id: UUID
    user_name: str
    joined_at: datetime
    left_at: Optional[datetime] = None
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

