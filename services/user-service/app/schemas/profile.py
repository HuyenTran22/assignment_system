from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class UserProfileBase(BaseModel):
    bio: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    preferences: Optional[Dict[str, Any]] = None


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    avatar_url: Optional[str] = None


class UserProfileResponse(UserProfileBase):
    id: UUID
    user_id: UUID
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserProfileWithUser(UserProfileResponse):
    user: Optional[Dict[str, Any]] = None

