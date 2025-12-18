from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class DiscussionThreadBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)


class DiscussionThreadCreate(DiscussionThreadBase):
    course_id: UUID


class DiscussionThreadUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    is_pinned: Optional[bool] = None
    is_locked: Optional[bool] = None


class DiscussionThreadResponse(DiscussionThreadBase):
    id: UUID
    course_id: UUID
    user_id: UUID
    is_pinned: bool
    is_locked: bool
    view_count: int
    reply_count: int
    created_at: datetime
    updated_at: datetime
    author_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class DiscussionReplyBase(BaseModel):
    content: str = Field(..., min_length=1)


class DiscussionReplyCreate(DiscussionReplyBase):
    thread_id: UUID
    parent_reply_id: Optional[UUID] = None


class DiscussionReplyUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1)


class DiscussionReplyResponse(DiscussionReplyBase):
    id: UUID
    thread_id: UUID
    user_id: UUID
    parent_reply_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    author_name: Optional[str] = None
    child_replies: List['DiscussionReplyResponse'] = []
    
    model_config = ConfigDict(from_attributes=True)


class DiscussionThreadDetailResponse(DiscussionThreadResponse):
    replies: List[DiscussionReplyResponse] = []

