from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from app.db import get_db
from app.core.security import get_current_user
from app.api.dependencies import require_teacher_or_manager_or_admin
from app.models.user import User, UserRole
from app.models.course import Course, CourseEnrollment, CourseRole
from app.models.video_call import VideoCallRoom, VideoCallParticipant, VideoCallStatus
from app.schemas.video_call import (
    VideoCallRoomResponse,
    VideoCallRoomUpdate,
    VideoCallJoinResponse,
    VideoCallParticipantInfo,
    VideoCallParticipantResponse
)
from app.core.config import settings

router = APIRouter()

# Jitsi Meet configuration
JITSI_DOMAIN = getattr(settings, 'JITSI_DOMAIN', 'meet.jit.si')
JITSI_APP_ID = getattr(settings, 'JITSI_APP_ID', None)
JITSI_APP_SECRET = getattr(settings, 'JITSI_APP_SECRET', None)


def check_course_access(course_id: UUID, user: User, db: Session):
    """Check if user is enrolled in the course."""
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.user_id == user.id
    ).first()
    
    if not enrollment:
        # Check if user is ADMIN
        user_role = user.role
        if isinstance(user_role, str):
            user_role = UserRole(user_role)
        
        if user_role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this course"
            )
    
    return enrollment


def get_or_create_room(course_id: UUID, db: Session) -> VideoCallRoom:
    """Get existing room or create new one for course."""
    room = db.query(VideoCallRoom).filter(VideoCallRoom.course_id == course_id).first()
    
    if not room:
        # Get course to generate room name
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Generate room name from course code (sanitized)
        room_name = f"course-{course.code.lower().replace(' ', '-').replace('_', '-')}-{str(course_id)[:8]}"
        
        # Generate Jitsi URL
        room_url = f"https://{JITSI_DOMAIN}/{room_name}"
        
        room = VideoCallRoom(
            course_id=course_id,
            room_name=room_name,
            room_url=room_url,
            status=VideoCallStatus.idle.value
        )
        db.add(room)
        db.commit()
        db.refresh(room)
    
    return room


@router.get("/{course_id}/video-call", response_model=VideoCallRoomResponse)
def get_video_call_room(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get video call room for a course."""
    check_course_access(course_id, current_user, db)
    
    room = get_or_create_room(course_id, db)
    
    # Get participant count
    participant_count = db.query(VideoCallParticipant).filter(
        VideoCallParticipant.room_id == room.id,
        VideoCallParticipant.is_active == True
    ).count()
    
    # Get active participants
    active_participants = db.query(VideoCallParticipant).options(
        joinedload(VideoCallParticipant.user)
    ).filter(
        VideoCallParticipant.room_id == room.id,
        VideoCallParticipant.is_active == True
    ).all()
    
    participant_info = []
    for p in active_participants:
        participant_info.append(VideoCallParticipantInfo(
            id=p.id,
            user_id=p.user_id,
            user_name=p.user.full_name if p.user else "Unknown",
            user_email=p.user.email if p.user else "",
            joined_at=p.joined_at,
            left_at=p.left_at,
            is_active=p.is_active
        ))
    
    room_dict = {
        'id': room.id,
        'course_id': room.course_id,
        'room_name': room.room_name,
        'room_url': room.room_url,
        'status': room.status,
        'is_locked': room.is_locked,
        'max_participants': room.max_participants,
        'started_at': room.started_at,
        'ended_at': room.ended_at,
        'created_at': room.created_at,
        'updated_at': room.updated_at,
        'participant_count': participant_count,
        'active_participants': participant_info
    }
    
    return VideoCallRoomResponse(**room_dict)


@router.post("/{course_id}/video-call/join", response_model=VideoCallJoinResponse)
def join_video_call(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Join video call room for a course."""
    enrollment = check_course_access(course_id, current_user, db)
    
    room = get_or_create_room(course_id, db)
    
    # Check if room is locked
    if room.is_locked:
        # Only teachers and admins can join locked rooms
        user_role = current_user.role
        if isinstance(user_role, str):
            user_role = UserRole(user_role)
        
        if user_role not in (UserRole.ADMIN, UserRole.MANAGER):
            # Check if user is teacher in this course
            if not enrollment or enrollment.role_in_course != CourseRole.teacher:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Room is locked. Only teachers can join."
                )
    
    # Check max participants
    active_count = db.query(VideoCallParticipant).filter(
        VideoCallParticipant.room_id == room.id,
        VideoCallParticipant.is_active == True
    ).count()
    
    if active_count >= room.max_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room is full. Maximum {room.max_participants} participants allowed."
        )
    
    # Check if user already has active participation
    existing_participant = db.query(VideoCallParticipant).filter(
        VideoCallParticipant.room_id == room.id,
        VideoCallParticipant.user_id == current_user.id,
        VideoCallParticipant.is_active == True
    ).first()
    
    if not existing_participant:
        # Create new participant record
        participant = VideoCallParticipant(
            room_id=room.id,
            user_id=current_user.id,
            is_active=True
        )
        db.add(participant)
        
        # Update room status
        if room.status == VideoCallStatus.idle.value:
            room.status = VideoCallStatus.active.value
            room.started_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(participant)
    else:
        # Update existing participant
        existing_participant.joined_at = datetime.now(timezone.utc)
        existing_participant.left_at = None
        existing_participant.is_active = True
        db.commit()
    
    # Build response
    room_dict = {
        'id': room.id,
        'course_id': room.course_id,
        'room_name': room.room_name,
        'room_url': room.room_url,
        'status': room.status,
        'is_locked': room.is_locked,
        'max_participants': room.max_participants,
        'started_at': room.started_at,
        'ended_at': room.ended_at,
        'created_at': room.created_at,
        'updated_at': room.updated_at,
        'participant_count': active_count + 1,
        'active_participants': []
    }
    
    # Generate Jitsi URL with user display name
    display_name = current_user.full_name or current_user.email
    jitsi_url = f"{room.room_url}?userInfo.displayName={display_name}"
    
    return VideoCallJoinResponse(
        room=VideoCallRoomResponse(**room_dict),
        jitsi_url=jitsi_url,
        token=None
    )


@router.post("/{course_id}/video-call/leave")
def leave_video_call(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Leave video call room."""
    check_course_access(course_id, current_user, db)
    
    room = db.query(VideoCallRoom).filter(VideoCallRoom.course_id == course_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video call room not found"
        )
    
    # Find active participant
    participant = db.query(VideoCallParticipant).filter(
        VideoCallParticipant.room_id == room.id,
        VideoCallParticipant.user_id == current_user.id,
        VideoCallParticipant.is_active == True
    ).first()
    
    if participant:
        participant.is_active = False
        participant.left_at = datetime.now(timezone.utc)
        
        # Check if room should be set to idle
        active_count = db.query(VideoCallParticipant).filter(
            VideoCallParticipant.room_id == room.id,
            VideoCallParticipant.is_active == True
        ).count()
        
        if active_count <= 1:  # Only this user left
            room.status = VideoCallStatus.idle.value
        
        db.commit()
    
    return {"message": "Left video call room successfully"}


@router.put("/{course_id}/video-call", response_model=VideoCallRoomResponse)
def update_video_call_room(
    course_id: UUID,
    room_data: VideoCallRoomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Update video call room settings (lock/unlock, max participants)."""
    # Check if user is teacher in this course
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.user_id == current_user.id,
        CourseEnrollment.role_in_course == CourseRole.teacher
    ).first()
    
    user_role = current_user.role
    if isinstance(user_role, str):
        user_role = UserRole(user_role)
    
    if not enrollment and user_role not in (UserRole.ADMIN, UserRole.MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only course teachers can update room settings"
        )
    
    room = get_or_create_room(course_id, db)
    
    if room_data.is_locked is not None:
        room.is_locked = room_data.is_locked
    
    if room_data.max_participants is not None:
        room.max_participants = room_data.max_participants
    
    db.commit()
    db.refresh(room)
    
    # Get participant count
    participant_count = db.query(VideoCallParticipant).filter(
        VideoCallParticipant.room_id == room.id,
        VideoCallParticipant.is_active == True
    ).count()
    
    room_dict = {
        'id': room.id,
        'course_id': room.course_id,
        'room_name': room.room_name,
        'room_url': room.room_url,
        'status': room.status,
        'is_locked': room.is_locked,
        'max_participants': room.max_participants,
        'started_at': room.started_at,
        'ended_at': room.ended_at,
        'created_at': room.created_at,
        'updated_at': room.updated_at,
        'participant_count': participant_count,
        'active_participants': []
    }
    
    return VideoCallRoomResponse(**room_dict)


@router.get("/{course_id}/video-call/participants", response_model=list[VideoCallParticipantResponse])
def get_video_call_participants(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of active participants in video call room."""
    check_course_access(course_id, current_user, db)
    
    room = db.query(VideoCallRoom).filter(VideoCallRoom.course_id == course_id).first()
    if not room:
        return []
    
    participants = db.query(VideoCallParticipant).options(
        joinedload(VideoCallParticipant.user)
    ).filter(
        VideoCallParticipant.room_id == room.id,
        VideoCallParticipant.is_active == True
    ).all()
    
    result = []
    for p in participants:
        result.append(VideoCallParticipantResponse(
            id=p.id,
            room_id=p.room_id,
            user_id=p.user_id,
            user_name=p.user.full_name if p.user else "Unknown",
            joined_at=p.joined_at,
            left_at=p.left_at,
            is_active=p.is_active
        ))
    
    return result

