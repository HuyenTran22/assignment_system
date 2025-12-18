from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, noload
from sqlalchemy import text
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from pathlib import Path
import math
import httpx
import mimetypes

from app.db import get_db
from app.core.security import get_current_user, require_teacher
from app.core.file_utils import save_upload_file, validate_file_size, validate_mime_type
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.course import CourseEnrollment
from app.models.assignment import Assignment
from app.models.submission import Submission, SubmissionFile, SubmissionStatus
from app.models.grade import Grade
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionResponse,
    SubmissionWithStudentResponse,
    PaginatedSubmissionResponse
)

router = APIRouter()


@router.get("/assignments/{assignment_id}/submissions", response_model=PaginatedSubmissionResponse)
def list_submissions(
    assignment_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[SubmissionStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    """
    List submissions for an assignment (teacher view).
    
    Requires TEACHER or ADMIN role.
    
    - **status_filter**: Filter by submission status
    - **page**: Page number
    - **limit**: Items per page
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check permission
    if current_user.role != UserRole.ADMIN:
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == assignment.course_id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        if not enrollment or enrollment.role_in_course != "teacher":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view submissions"
            )
    
    query = db.query(Submission).filter(Submission.assignment_id == assignment_id)
    
    # Filter by status
    if status_filter:
        query = query.filter(Submission.status == status_filter)
    
    # Get total
    total = query.count()
    
    # Pagination
    offset = (page - 1) * limit
    submissions = query.order_by(Submission.submitted_at.asc()).offset(offset).limit(limit).all()
    
    if not submissions:
        return PaginatedSubmissionResponse(
            items=[],
            total=0,
            page=page,
            limit=limit,
            pages=0
        )
    
    # Bulk load students, grades, and files to avoid N+1 queries
    student_ids = [sub.student_id for sub in submissions]
    submission_ids = [sub.id for sub in submissions]
    
    students_dict = {user.id: user for user in db.query(User).filter(User.id.in_(student_ids)).all()}
    grades_dict = {grade.submission_id: grade for grade in db.query(Grade).filter(Grade.submission_id.in_(submission_ids)).all()}
    
    # Fetch all submission files
    files_query = db.query(SubmissionFile).filter(SubmissionFile.submission_id.in_(submission_ids)).all()
    files_dict = {}
    for file in files_query:
        if file.submission_id not in files_dict:
            files_dict[file.submission_id] = []
        files_dict[file.submission_id].append(file)
    
    # Build responses with student info, grade, and files
    submission_responses = []
    for submission in submissions:
        student = students_dict.get(submission.student_id)
        grade = grades_dict.get(submission.id)
        files = files_dict.get(submission.id, [])
        
        submission_dict = SubmissionResponse.model_validate(submission).model_dump()
        submission_dict['student'] = {
            "id": str(student.id),
            "full_name": student.full_name,
            "email": student.email
        } if student else None
        submission_dict['grade'] = {
            "score": float(grade.score),
            "graded_at": grade.graded_at.isoformat()
        } if grade else None
        submission_dict['files'] = [
            {
                "id": str(file.id),
                "original_name": file.original_name,
                "file_size": file.file_size
            } for file in files
        ]
        
        submission_responses.append(SubmissionWithStudentResponse(**submission_dict))
    
    return PaginatedSubmissionResponse(
        items=submission_responses,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 0
    )


@router.get("/submissions/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get submission details."""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check permission
    if current_user.role == UserRole.STUDENT:
        if submission.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own submissions"
            )
    elif current_user.role == UserRole.TEACHER:
        assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == assignment.course_id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        if not enrollment or enrollment.role_in_course != "teacher":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this submission"
            )
    
    # Build response manually to avoid relationship loading issues
    submission_files = db.query(SubmissionFile).filter(
        SubmissionFile.submission_id == submission.id
    ).all()
    
    response_dict = {
        "id": submission.id,
        "assignment_id": submission.assignment_id,
        "student_id": submission.student_id,
        "submitted_at": submission.submitted_at,
        "status": submission.status,
        "comment": submission.comment,
        "plagiarism_score": float(submission.plagiarism_score) if submission.plagiarism_score else None,
        "files": [
            {
                "id": f.id,
                "file_path": f.file_path,
                "original_name": f.original_name,
                "file_size": f.file_size,
                "uploaded_at": f.uploaded_at
            }
            for f in submission_files
        ]
    }
    
    return SubmissionResponse(**response_dict)


async def trigger_plagiarism_check_background(assignment_id: UUID):
    """Background task to trigger plagiarism check."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Call plagiarism service INTERNAL endpoint (no auth required)
            response = await client.post(
                f"{settings.PLAGIARISM_SERVICE_URL}/internal/assignments/{assignment_id}/plagiarism-check",
                headers={"Content-Type": "application/json"}
            )
            if response.status_code not in [200, 202]:
                print(f"Warning: Plagiarism check returned status {response.status_code}: {response.text}")
            else:
                print(f"✓ Plagiarism check triggered for assignment {assignment_id}")
    except Exception as e:
        print(f"Warning: Failed to trigger plagiarism check: {e}")


@router.post("/assignments/{assignment_id}/submissions", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_assignment(
    assignment_id: UUID,
    files: List[UploadFile] = File(default=[]),
    comment: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit an assignment.
    
    Students only. Can submit multiple files.
    
    - **files**: Optional list of files (max 20MB each)
    - **comment**: Optional comment
    """
    try:
        # Only students can submit
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only students can submit assignments"
            )
        
        # Validate that at least one file or comment is provided
        has_files = bool(files and len(files) > 0)
        if not has_files and not comment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide at least one file or a comment"
            )
        
        # Check assignment exists
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # Check enrollment
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == assignment.course_id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this course"
            )
        
        # Check if already submitted
        existing_submission = db.query(Submission).options(
            noload(Submission.assignment),
            noload(Submission.student),
            noload(Submission.files),
            noload(Submission.grade)
        ).filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == current_user.id
        ).first()
        
        # Determine status
        now = datetime.now(timezone.utc)
        if now > assignment.due_at:
            if not assignment.allow_late_submission:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assignment deadline has passed and late submissions are not allowed"
                )
            submission_status = SubmissionStatus.LATE
        else:
            submission_status = SubmissionStatus.SUBMITTED
        
        # If resubmitting
        if existing_submission:
            submission_status = SubmissionStatus.RESUBMITTED
            # Delete old submission and create new one
            db.delete(existing_submission)
            db.commit()
        
        # Create submission
        submission = Submission(
            assignment_id=assignment_id,
            student_id=current_user.id,
            status=submission_status,
            comment=comment
        )
        
        db.add(submission)
        db.commit()
        db.refresh(submission)
        
        # Save files (if any)
        if has_files:
            for file in files:
                # Validate file
                content = await file.read()
                file_size = len(content)
                
                if not validate_file_size(file_size):
                    # Rollback submission
                    db.delete(submission)
                    db.commit()
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"File '{file.filename}' exceeds maximum size ({settings.MAX_FILE_SIZE} bytes)"
                    )
                
                if not validate_mime_type(file.content_type):
                    # Rollback submission
                    db.delete(submission)
                    db.commit()
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"File type '{file.content_type}' not allowed"
                    )
                
                # Reset file pointer
                await file.seek(0)
                
                # Save file
                file_path, saved_size = save_upload_file(file, f"submissions/{submission.id}")
                
                # Create database record
                submission_file = SubmissionFile(
                    submission_id=submission.id,
                    file_path=file_path,
                    original_name=file.filename,
                    file_size=saved_size
                )
                
                db.add(submission_file)
            
            db.commit()
            db.refresh(submission)
        
        # Trigger plagiarism check in background ONLY if enabled for this assignment
        # This runs asynchronously and won't block the submission response
        # Use getattr in case column doesn't exist in database yet
        if getattr(assignment, 'enable_plagiarism_check', True):
            background_tasks.add_task(trigger_plagiarism_check_background, assignment_id)
        
        # Build response manually to avoid relationship loading issues
        # Get files separately
        submission_files = db.query(SubmissionFile).filter(
            SubmissionFile.submission_id == submission.id
        ).all()
        
        # Build response dict
        response_dict = {
            "id": submission.id,
            "assignment_id": submission.assignment_id,
            "student_id": submission.student_id,
            "submitted_at": submission.submitted_at,
            "status": submission.status,
            "comment": submission.comment,
            "plagiarism_score": float(submission.plagiarism_score) if submission.plagiarism_score else None,
            "files": [
                {
                    "id": f.id,
                    "file_path": f.file_path,
                    "original_name": f.original_name,
                    "file_size": f.file_size,
                    "uploaded_at": f.uploaded_at
                }
                for f in submission_files
            ]
        }
        
        return SubmissionResponse(**response_dict)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Failed to submit assignment: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit assignment: {str(e)}"
        )


@router.get("/assignments/{assignment_id}/submissions/my", response_model=SubmissionResponse)
def get_my_submission(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's submission for a specific assignment.
    
    Students can only see their own submission.
    """
    try:
        # Use options to prevent eager loading of relationships
        submission = db.query(Submission).options(
            noload(Submission.assignment),
            noload(Submission.student),
            noload(Submission.files),
            noload(Submission.grade)
        ).filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == current_user.id
        ).first()
        
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Build response manually to avoid relationship loading issues
        # Get files separately
        submission_files = db.query(SubmissionFile).filter(
            SubmissionFile.submission_id == submission.id
        ).all()
        
        # Build response dict
        response_dict = {
            "id": submission.id,
            "assignment_id": submission.assignment_id,
            "student_id": submission.student_id,
            "submitted_at": submission.submitted_at,
            "status": submission.status,
            "comment": submission.comment,
            "plagiarism_score": float(submission.plagiarism_score) if submission.plagiarism_score else None,
            "files": [
                {
                    "id": f.id,
                    "file_path": f.file_path,
                    "original_name": f.original_name,
                    "file_size": f.file_size,
                    "uploaded_at": f.uploaded_at
                }
                for f in submission_files
            ]
        }
        
        return SubmissionResponse(**response_dict)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Failed to get my submission: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get submission: {str(e)}"
        )


@router.get("/students/me/submissions", response_model=List[SubmissionResponse])
def get_my_submissions(
    course_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all submissions for the current student.
    
    - **course_id**: Optional filter by course
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for students only"
        )
    
    query = db.query(Submission).filter(Submission.student_id == current_user.id)
    
    # Filter by course
    if course_id:
        query = query.join(Assignment).filter(Assignment.course_id == course_id)
    
    submissions = query.order_by(Submission.submitted_at.desc()).all()
    
    # Build responses manually to avoid relationship loading issues
    submission_responses = []
    for submission in submissions:
        submission_files = db.query(SubmissionFile).filter(
            SubmissionFile.submission_id == submission.id
        ).all()
        
        response_dict = {
            "id": submission.id,
            "assignment_id": submission.assignment_id,
            "student_id": submission.student_id,
            "submitted_at": submission.submitted_at,
            "status": submission.status,
            "comment": submission.comment,
            "plagiarism_score": float(submission.plagiarism_score) if submission.plagiarism_score else None,
            "files": [
                {
                    "id": f.id,
                    "file_path": f.file_path,
                    "original_name": f.original_name,
                    "file_size": f.file_size,
                    "uploaded_at": f.uploaded_at
                }
                for f in submission_files
            ]
        }
        submission_responses.append(SubmissionResponse(**response_dict))
    
    return submission_responses


@router.get("/files/{file_id}/download")
def download_submission_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download a submission file.
    
    Students can download their own files.
    Teachers can download files from their course submissions.
    """
    submission_file = db.query(SubmissionFile).filter(SubmissionFile.id == file_id).first()
    if not submission_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Get submission
    submission = db.query(Submission).filter(Submission.id == submission_file.submission_id).first()
    
    # Check permission
    if current_user.role == UserRole.STUDENT:
        # Allow if:
        # 1. Downloading own files
        # 2. Assigned as peer reviewer for this submission
        if submission.student_id != current_user.id:
            # Check if user is a peer reviewer for this submission
            # Query peer_reviews table directly (cross-service check)
            peer_review_check = db.execute(
                text("""
                    SELECT id FROM peer_reviews 
                    WHERE submission_id = :submission_id 
                    AND reviewer_id = :reviewer_id
                """),
                {"submission_id": str(submission.id), "reviewer_id": str(current_user.id)}
            ).fetchone()
            
            if not peer_review_check:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only download your own files or files assigned for peer review"
                )
    elif current_user.role == UserRole.TEACHER:
        assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == assignment.course_id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        if not enrollment or enrollment.role_in_course != "teacher":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to download this file"
            )
    
    # Get full file path
    file_path = Path(settings.UPLOAD_DIR) / submission_file.file_path
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )
    
    # Determine content type
    content_type, _ = mimetypes.guess_type(str(file_path))
    if not content_type:
        ext = file_path.suffix.lower()
        content_type_map = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.txt': 'text/plain',
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed',
        }
        content_type = content_type_map.get(ext, 'application/octet-stream')
    
    # Return file with UTF-8 encoded filename for Vietnamese characters
    from urllib.parse import quote
    encoded_filename = quote(submission_file.original_name)
    
    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename*=UTF-8\'\'{encoded_filename}'
        }
    )
