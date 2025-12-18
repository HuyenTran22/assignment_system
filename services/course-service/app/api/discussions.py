from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
import httpx

from app.db import get_db
from app.core.security import get_current_user
from app.api.dependencies import require_teacher_or_manager_or_admin
from app.models.user import User
from app.models.course import Course, CourseEnrollment, CourseRole
from app.models.discussion import DiscussionThread, DiscussionReply
from app.schemas.discussion import (
    DiscussionThreadCreate, DiscussionThreadUpdate, DiscussionThreadResponse,
    DiscussionReplyCreate, DiscussionReplyUpdate, DiscussionReplyResponse,
    DiscussionThreadDetailResponse
)
from app.api.course_materials import check_course_access
from app.core.config import settings

router = APIRouter(prefix="/courses", tags=["Discussions"])


@router.get("/{course_id}/discussions", response_model=List[DiscussionThreadResponse])
def list_threads(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all discussion threads in a course."""
    check_course_access(course_id, current_user, db)
    
    threads = db.query(DiscussionThread).filter(
        DiscussionThread.course_id == course_id
    ).order_by(
        DiscussionThread.is_pinned.desc(),
        DiscussionThread.created_at.desc()
    ).all()
    
    # Add author names
    result = []
    for thread in threads:
        thread_dict = DiscussionThreadResponse.model_validate(thread).model_dump()
        thread_dict['author_name'] = thread.author.full_name if thread.author else None
        result.append(DiscussionThreadResponse(**thread_dict))
    
    return result


@router.post("/{course_id}/discussions", response_model=DiscussionThreadResponse, status_code=status.HTTP_201_CREATED)
def create_thread(
    course_id: UUID,
    thread_data: DiscussionThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new discussion thread."""
    check_course_access(course_id, current_user, db)
    
    thread = DiscussionThread(
        course_id=course_id,
        user_id=current_user.id,
        title=thread_data.title,
        content=thread_data.content
    )
    
    db.add(thread)
    db.commit()
    db.refresh(thread)
    
    thread_dict = DiscussionThreadResponse.model_validate(thread).model_dump()
    thread_dict['author_name'] = current_user.full_name
    return DiscussionThreadResponse(**thread_dict)


@router.get("/discussions/{thread_id}", response_model=DiscussionThreadDetailResponse)
def get_thread(
    thread_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a discussion thread with replies."""
    thread = db.query(DiscussionThread).filter(DiscussionThread.id == thread_id).first()
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )
    
    check_course_access(thread.course_id, current_user, db)
    
    # Increment view count
    thread.view_count += 1
    db.commit()
    
    # Get replies (top-level only, nested replies will be in child_replies)
    top_level_replies = db.query(DiscussionReply).filter(
        DiscussionReply.thread_id == thread_id,
        DiscussionReply.parent_reply_id == None
    ).order_by(DiscussionReply.created_at).all()
    
    def build_reply_tree(reply: DiscussionReply) -> DiscussionReplyResponse:
        reply_dict = DiscussionReplyResponse.model_validate(reply).model_dump()
        reply_dict['author_name'] = reply.author.full_name if reply.author else None
        reply_dict['child_replies'] = [
            build_reply_tree(child) for child in reply.child_replies
        ]
        return DiscussionReplyResponse(**reply_dict)
    
    replies = [build_reply_tree(reply) for reply in top_level_replies]
    
    thread_dict = DiscussionThreadDetailResponse.model_validate(thread).model_dump()
    thread_dict['author_name'] = thread.author.full_name if thread.author else None
    thread_dict['replies'] = replies
    
    return DiscussionThreadDetailResponse(**thread_dict)


@router.put("/discussions/{thread_id}", response_model=DiscussionThreadResponse)
def update_thread(
    thread_id: UUID,
    thread_data: DiscussionThreadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a discussion thread (author or teacher/admin can pin/lock)."""
    thread = db.query(DiscussionThread).filter(DiscussionThread.id == thread_id).first()
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )
    
    check_course_access(thread.course_id, current_user, db)
    
    # Only author can edit content, teacher/admin can pin/lock
    update_data = thread_data.model_dump(exclude_unset=True)
    
    if 'is_pinned' in update_data or 'is_locked' in update_data:
        # Check if user is teacher/admin
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == thread.course_id,
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.role_in_course == CourseRole.teacher
        ).first()
        
        if not enrollment and current_user.role not in ('ADMIN', 'MANAGER'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only teachers can pin/lock threads"
            )
    
    if thread.user_id != current_user.id:
        # Remove content updates if not author
        update_data.pop('title', None)
        update_data.pop('content', None)
    
    for field, value in update_data.items():
        setattr(thread, field, value)
    
    db.commit()
    db.refresh(thread)
    
    thread_dict = DiscussionThreadResponse.model_validate(thread).model_dump()
    thread_dict['author_name'] = thread.author.full_name if thread.author else None
    return DiscussionThreadResponse(**thread_dict)


@router.delete("/discussions/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_thread(
    thread_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a discussion thread."""
    thread = db.query(DiscussionThread).filter(DiscussionThread.id == thread_id).first()
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )
    
    check_course_access(thread.course_id, current_user, db)
    
    # Only author or teacher/admin can delete
    if thread.user_id != current_user.id:
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == thread.course_id,
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.role_in_course == CourseRole.teacher
        ).first()
        
        if not enrollment and current_user.role not in ('ADMIN', 'MANAGER'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only author or teachers can delete threads"
            )
    
    db.delete(thread)
    db.commit()
    
    return None


async def send_discussion_reply_notifications(
    thread_id: UUID,
    thread_title: str,
    course_id: UUID,
    replier_id: UUID,
    replier_name: str,
    db_url: str
):
    """Send notifications to ALL thread participants when someone replies."""
    try:
        # Create new DB session for background task
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        engine = create_engine(db_url)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        try:
            # Get thread author
            thread = db.query(DiscussionThread).filter(DiscussionThread.id == thread_id).first()
            if not thread:
                print(f"Warning: Thread {thread_id} not found for notification")
                return
            
            # Get all unique users who have participated (thread author + all repliers)
            participant_ids = set()
            participant_ids.add(thread.user_id)  # Thread author
            
            # Get all previous repliers
            replies = db.query(DiscussionReply).filter(DiscussionReply.thread_id == thread_id).all()
            for reply in replies:
                participant_ids.add(reply.user_id)
            
            # Remove current replier (don't notify yourself)
            participant_ids.discard(replier_id)
            
            if not participant_ids:
                print(f"No participants to notify for thread {thread_id}")
                return
            
            print(f"[Discussion] Notifying {len(participant_ids)} participants: {participant_ids}")
            
            # Send notification to all participants
            async with httpx.AsyncClient(timeout=10.0) as client:
                notification_data = {
                    "user_ids": [str(uid) for uid in participant_ids],
                    "type": "DISCUSSION_REPLY",
                    "title": "New Reply in Discussion",
                    "message": f"{replier_name} replied in thread: {thread_title}",
                    "send_email": True,
                    "action_url": f"/courses/{course_id}/discussions/{thread_id}"
                }
                
                response = await client.post(
                    f"{settings.NOTIFICATION_SERVICE_URL}/notifications/create",
                    json=notification_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 201:
                    print(f"✓ Discussion reply notifications sent to {len(participant_ids)} users")
                else:
                    print(f"Warning: Notification returned status {response.status_code}: {response.text}")
        finally:
            db.close()
            
    except Exception as e:
        print(f"Warning: Failed to send discussion reply notifications: {e}")
        import traceback
        traceback.print_exc()


@router.post("/discussions/{thread_id}/replies", response_model=DiscussionReplyResponse, status_code=status.HTTP_201_CREATED)
async def create_reply(
    thread_id: UUID,
    reply_data: DiscussionReplyCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a reply to a thread."""
    thread = db.query(DiscussionThread).filter(DiscussionThread.id == thread_id).first()
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )
    
    if thread.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Thread is locked"
        )
    
    check_course_access(thread.course_id, current_user, db)
    
    reply = DiscussionReply(
        thread_id=thread_id,
        user_id=current_user.id,
        content=reply_data.content,
        parent_reply_id=reply_data.parent_reply_id
    )
    
    # Update reply count
    thread.reply_count += 1
    
    db.add(reply)
    db.commit()
    db.refresh(reply)
    
    # Send notifications to ALL thread participants (author + previous repliers)
    print(f"[Discussion Reply] New reply by {current_user.full_name} in thread: {thread.title}")
    background_tasks.add_task(
        send_discussion_reply_notifications,
        thread_id=thread.id,
        thread_title=thread.title,
        course_id=thread.course_id,
        replier_id=current_user.id,
        replier_name=current_user.full_name,
        db_url=settings.DATABASE_URL
    )
    
    reply_dict = DiscussionReplyResponse.model_validate(reply).model_dump()
    reply_dict['author_name'] = current_user.full_name
    return DiscussionReplyResponse(**reply_dict)


@router.put("/replies/{reply_id}", response_model=DiscussionReplyResponse)
def update_reply(
    reply_id: UUID,
    reply_data: DiscussionReplyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a reply."""
    reply = db.query(DiscussionReply).filter(DiscussionReply.id == reply_id).first()
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    if reply.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only author can edit reply"
        )
    
    update_data = reply_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reply, field, value)
    
    db.commit()
    db.refresh(reply)
    
    reply_dict = DiscussionReplyResponse.model_validate(reply).model_dump()
    reply_dict['author_name'] = reply.author.full_name if reply.author else None
    return DiscussionReplyResponse(**reply_dict)


@router.delete("/replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reply(
    reply_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a reply."""
    reply = db.query(DiscussionReply).filter(DiscussionReply.id == reply_id).first()
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    # Only author or teacher/admin can delete
    if reply.user_id != current_user.id:
        thread = reply.thread
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == thread.course_id,
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.role_in_course == CourseRole.teacher
        ).first()
        
        if not enrollment and current_user.role not in ('ADMIN', 'MANAGER'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only author or teachers can delete replies"
            )
    
    # Update reply count
    reply.thread.reply_count -= 1
    
    db.delete(reply)
    db.commit()
    
    return None

