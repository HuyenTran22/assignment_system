from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.db import get_db
from app.core.security import get_current_user
from app.api.dependencies import require_teacher_or_manager_or_admin
from app.models.user import User, UserRole
from app.models.course import Course, CourseEnrollment, CourseRole
from app.models.live_class import LiveSession, SessionAttendance, SessionRecording
from app.schemas.live_class import (
    LiveSessionCreate, LiveSessionUpdate, LiveSessionResponse,
    SessionAttendanceResponse, SessionRecordingCreate, SessionRecordingResponse,
    LiveSessionDetailResponse
)
from app.api.course_materials import check_course_access

router = APIRouter(prefix="/courses", tags=["Live Classes"])


def check_session_access(session_id: UUID, user: User, db: Session, require_teacher: bool = False) -> LiveSession:
    """Check if user has access to live session."""
    session = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Live session not found"
        )
    
    # Check course access
    check_course_access(session.course_id, user, db, require_teacher)
    
    return session


# Live Session CRUD
@router.post("/{course_id}/live-sessions", response_model=LiveSessionResponse, status_code=status.HTTP_201_CREATED)
def create_live_session(
    course_id: UUID,
    session_data: LiveSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Create a new live session (Teacher/Manager/Admin only)."""
    check_course_access(course_id, current_user, db, require_teacher=True)
    
    # Validate scheduled times
    if session_data.scheduled_end <= session_data.scheduled_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scheduled end time must be after start time"
        )
    
    session = LiveSession(
        course_id=course_id,
        created_by=current_user.id,
        title=session_data.title,
        description=session_data.description,
        meeting_url=session_data.meeting_url,
        meeting_id=session_data.meeting_id,
        meeting_password=session_data.meeting_password,
        scheduled_start=session_data.scheduled_start,
        scheduled_end=session_data.scheduled_end,
        max_participants=session_data.max_participants,
        is_recorded=session_data.is_recorded,
        extra_data=session_data.extra_data,
        status="scheduled"
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    result = LiveSessionResponse.model_validate(session)
    result.creator_name = current_user.full_name
    result.attendance_count = 0
    
    return result


@router.get("/{course_id}/live-sessions", response_model=List[LiveSessionResponse])
def list_live_sessions(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[str] = None
):
    """List all live sessions in a course."""
    check_course_access(course_id, current_user, db)
    
    query = db.query(LiveSession).filter(LiveSession.course_id == course_id)
    
    if status_filter:
        query = query.filter(LiveSession.status == status_filter)
    
    sessions = query.order_by(LiveSession.scheduled_start.desc()).all()
    
    result = []
    for session in sessions:
        session_dict = LiveSessionResponse.model_validate(session).model_dump()
        session_dict['creator_name'] = session.creator.full_name if session.creator else None
        session_dict['attendance_count'] = db.query(SessionAttendance).filter(
            SessionAttendance.session_id == session.id
        ).count()
        result.append(LiveSessionResponse(**session_dict))
    
    return result


@router.get("/live-sessions/{session_id}", response_model=LiveSessionDetailResponse)
def get_live_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get live session details with attendance and recordings."""
    session = check_session_access(session_id, current_user, db)
    
    # Get attendance
    attendance_list = db.query(SessionAttendance).filter(
        SessionAttendance.session_id == session_id
    ).all()
    
    attendance_result = []
    for att in attendance_list:
        att_dict = SessionAttendanceResponse.model_validate(att).model_dump()
        att_dict['user_name'] = att.user.full_name if att.user else None
        attendance_result.append(SessionAttendanceResponse(**att_dict))
    
    # Get recordings
    recordings = db.query(SessionRecording).filter(
        SessionRecording.session_id == session_id
    ).order_by(SessionRecording.created_at.desc()).all()
    
    recordings_result = [SessionRecordingResponse.model_validate(r) for r in recordings]
    
    session_dict = LiveSessionDetailResponse.model_validate(session).model_dump()
    session_dict['creator_name'] = session.creator.full_name if session.creator else None
    session_dict['attendance'] = attendance_result
    session_dict['recordings'] = recordings_result
    session_dict['attendance_count'] = len(attendance_result)
    
    return LiveSessionDetailResponse(**session_dict)


@router.put("/live-sessions/{session_id}", response_model=LiveSessionResponse)
def update_live_session(
    session_id: UUID,
    session_data: LiveSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Update a live session (Teacher/Manager/Admin only)."""
    session = check_session_access(session_id, current_user, db, require_teacher=True)
    
    # Validate scheduled times if both are provided
    if session_data.scheduled_start and session_data.scheduled_end:
        if session_data.scheduled_end <= session_data.scheduled_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled end time must be after start time"
            )
    elif session_data.scheduled_start:
        if session.scheduled_end <= session_data.scheduled_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled end time must be after start time"
            )
    elif session_data.scheduled_end:
        if session_data.scheduled_end <= session.scheduled_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled end time must be after start time"
            )
    
    update_data = session_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)
    
    db.commit()
    db.refresh(session)
    
    result = LiveSessionResponse.model_validate(session)
    result.creator_name = session.creator.full_name if session.creator else None
    result.attendance_count = db.query(SessionAttendance).filter(
        SessionAttendance.session_id == session.id
    ).count()
    
    return result


@router.delete("/live-sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_live_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Delete a live session (Teacher/Manager/Admin only)."""
    session = check_session_access(session_id, current_user, db, require_teacher=True)
    
    db.delete(session)
    db.commit()
    
    return None


# Session Management
@router.post("/live-sessions/{session_id}/start", response_model=LiveSessionResponse)
def start_live_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Start a live session (Teacher/Manager/Admin only)."""
    session = check_session_access(session_id, current_user, db, require_teacher=True)
    
    if session.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start session with status: {session.status}"
        )
    
    session.status = "ongoing"
    session.actual_start = datetime.now(session.scheduled_start.tzinfo)
    
    db.commit()
    db.refresh(session)
    
    result = LiveSessionResponse.model_validate(session)
    result.creator_name = session.creator.full_name if session.creator else None
    result.attendance_count = db.query(SessionAttendance).filter(
        SessionAttendance.session_id == session.id
    ).count()
    
    return result


@router.post("/live-sessions/{session_id}/end", response_model=LiveSessionResponse)
def end_live_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """End a live session (Teacher/Manager/Admin only)."""
    session = check_session_access(session_id, current_user, db, require_teacher=True)
    
    if session.status != "ongoing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot end session with status: {session.status}"
        )
    
    session.status = "completed"
    session.actual_end = datetime.now(session.scheduled_start.tzinfo)
    
    # Update attendance left_at for users still in session
    db.query(SessionAttendance).filter(
        SessionAttendance.session_id == session_id,
        SessionAttendance.left_at == None
    ).update({SessionAttendance.left_at: session.actual_end})
    
    db.commit()
    db.refresh(session)
    
    result = LiveSessionResponse.model_validate(session)
    result.creator_name = session.creator.full_name if session.creator else None
    result.attendance_count = db.query(SessionAttendance).filter(
        SessionAttendance.session_id == session.id
    ).count()
    
    return result


@router.post("/live-sessions/{session_id}/join", response_model=SessionAttendanceResponse, status_code=status.HTTP_201_CREATED)
def join_live_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Join a live session."""
    session = check_session_access(session_id, current_user, db)
    
    # Check if session is available
    if session.status not in ("scheduled", "ongoing"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot join session with status: {session.status}"
        )
    
    # Check max participants
    if session.max_participants:
        current_count = db.query(SessionAttendance).filter(
            SessionAttendance.session_id == session_id,
            SessionAttendance.left_at == None
        ).count()
        
        if current_count >= session.max_participants:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Session is full"
            )
    
    # Check if user already joined
    existing = db.query(SessionAttendance).filter(
        SessionAttendance.session_id == session_id,
        SessionAttendance.user_id == current_user.id,
        SessionAttendance.left_at == None
    ).first()
    
    if existing:
        # User already in session
        result = SessionAttendanceResponse.model_validate(existing)
        result.user_name = current_user.full_name
        return result
    
    # Create new attendance record
    attendance = SessionAttendance(
        session_id=session_id,
        user_id=current_user.id
    )
    
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    result = SessionAttendanceResponse.model_validate(attendance)
    result.user_name = current_user.full_name
    
    return result


@router.post("/live-sessions/{session_id}/leave", response_model=SessionAttendanceResponse)
def leave_live_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Leave a live session."""
    session = check_session_access(session_id, current_user, db)
    
    attendance = db.query(SessionAttendance).filter(
        SessionAttendance.session_id == session_id,
        SessionAttendance.user_id == current_user.id,
        SessionAttendance.left_at == None
    ).first()
    
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not currently in this session"
        )
    
    leave_time = datetime.now(attendance.joined_at.tzinfo)
    attendance.left_at = leave_time
    
    # Calculate duration
    duration = (leave_time - attendance.joined_at).total_seconds() / 60
    attendance.duration_minutes = int(duration)
    
    db.commit()
    db.refresh(attendance)
    
    result = SessionAttendanceResponse.model_validate(attendance)
    result.user_name = current_user.full_name
    
    return result


# Attendance Management
@router.get("/live-sessions/{session_id}/attendance", response_model=List[SessionAttendanceResponse])
def get_session_attendance(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance list for a session."""
    session = check_session_access(session_id, current_user, db)
    
    attendance_list = db.query(SessionAttendance).filter(
        SessionAttendance.session_id == session_id
    ).order_by(SessionAttendance.joined_at).all()
    
    result = []
    for att in attendance_list:
        att_dict = SessionAttendanceResponse.model_validate(att).model_dump()
        att_dict['user_name'] = att.user.full_name if att.user else None
        result.append(SessionAttendanceResponse(**att_dict))
    
    return result


# Recording Management
@router.post("/live-sessions/{session_id}/recordings", response_model=SessionRecordingResponse, status_code=status.HTTP_201_CREATED)
def add_recording(
    session_id: UUID,
    recording_data: SessionRecordingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Add a recording to a session (Teacher/Manager/Admin only)."""
    session = check_session_access(session_id, current_user, db, require_teacher=True)
    
    recording = SessionRecording(
        session_id=session_id,
        recording_url=recording_data.recording_url,
        recording_type=recording_data.recording_type,
        file_size_bytes=recording_data.file_size_bytes,
        duration_seconds=recording_data.duration_seconds
    )
    
    db.add(recording)
    db.commit()
    db.refresh(recording)
    
    return SessionRecordingResponse.model_validate(recording)


@router.get("/live-sessions/{session_id}/recordings", response_model=List[SessionRecordingResponse])
def get_session_recordings(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recordings for a session."""
    session = check_session_access(session_id, current_user, db)
    
    recordings = db.query(SessionRecording).filter(
        SessionRecording.session_id == session_id
    ).order_by(SessionRecording.created_at.desc()).all()
    
    return [SessionRecordingResponse.model_validate(r) for r in recordings]


@router.delete("/recordings/{recording_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recording(
    recording_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Delete a recording (Teacher/Manager/Admin only)."""
    recording = db.query(SessionRecording).filter(SessionRecording.id == recording_id).first()
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found"
        )
    
    session = check_session_access(recording.session_id, current_user, db, require_teacher=True)
    
    db.delete(recording)
    db.commit()
    
    return None

