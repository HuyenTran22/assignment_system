from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from uuid import UUID
import os
from pathlib import Path

from app.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.profile import UserProfile
from app.schemas.profile import UserProfileResponse, UserProfileUpdate
from app.core.file_utils import save_upload_file, validate_file_size, validate_mime_type
from app.core.config import settings

router = APIRouter(prefix="/users/me", tags=["Profile"])


@router.get("/profile", response_model=UserProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        # Create default profile if not exists
        profile = UserProfile(
            user_id=current_user.id,
            social_links={},
            preferences={}
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return profile


@router.put("/profile", response_model=UserProfileResponse)
def update_my_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        # Create profile if not exists
        profile = UserProfile(
            user_id=current_user.id,
            social_links={},
            preferences={}
        )
        db.add(profile)
    
    # Update fields
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    
    return profile


@router.post("/profile/avatar", response_model=UserProfileResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload avatar image."""
    # Validate file type (only images)
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File type '{file.content_type}' not allowed. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Validate file size (max 5MB for images)
    content = await file.read()
    file_size = len(content)
    max_size = 5 * 1024 * 1024  # 5MB
    
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File size exceeds maximum allowed (5MB)"
        )
    
    # Reset file pointer
    await file.seek(0)
    
    # Save file
    file_path, _ = save_upload_file(file, f"avatars/{current_user.id}")
    
    # Get or create profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(
            user_id=current_user.id,
            social_links={},
            preferences={}
        )
        db.add(profile)
    
    # Update avatar URL
    # In production, use CDN URL. For now, use relative path
    profile.avatar_url = f"/uploads/{file_path}"
    
    db.commit()
    db.refresh(profile)
    
    return profile


@router.get("/users/{user_id}/profile", response_model=UserProfileResponse)
def get_user_profile(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get public profile of a user."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return profile

