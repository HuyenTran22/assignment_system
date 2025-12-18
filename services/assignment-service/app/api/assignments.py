from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
import math
import httpx

from app.db import get_db
from app.core.security import get_current_user
from app.api.dependencies import require_teacher_or_manager_or_admin
from app.core.file_utils import save_upload_file, validate_file_size, validate_mime_type
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.course import Course, CourseEnrollment, CourseRole
from app.models.assignment import Assignment, AssignmentFile
from app.models.submission import Submission
from app.models.grade import Grade
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentResponse,
    AssignmentFileResponse,
    PaginatedAssignmentResponse
)

router = APIRouter()


def build_assignment_response(assignment: Assignment, course: Optional[Course] = None, 
                              submission_count: int = 0, graded_count: int = 0, 
                              my_submission: Optional[dict] = None, files: List = None) -> AssignmentResponse:
    """
    Build AssignmentResponse from Assignment model.
    """
    # Create response from assignment model (excludes course relationship)
    response = AssignmentResponse.model_validate(assignment)
    
    # Set computed fields
    response.submission_count = submission_count
    response.graded_count = graded_count
    response.my_submission = my_submission
    response.files = files or []
    
    # Set course as dict (not relationship object)
    if course:
        response.course = {
            "id": str(course.id),
            "name": course.name,
            "code": course.code
        }
    else:
        response.course = None
    
    return response


@router.get("", response_model=PaginatedAssignmentResponse)
def list_all_assignments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all assignments accessible to the current user.
    
    - **Students**: Only assignments from enrolled courses
    - **Teachers/Managers/Admins**: All assignments from courses they teach/manage
    """
    try:
        query = db.query(Assignment)
        
        # Filter by role
        if current_user.role == UserRole.STUDENT:
            # Students only see assignments from enrolled courses
            enrolled_course_ids = db.query(CourseEnrollment.course_id).filter(
                CourseEnrollment.user_id == current_user.id
            ).subquery()
            query = query.filter(Assignment.course_id.in_(enrolled_course_ids))
        elif current_user.role == UserRole.TEACHER:
            # Teachers see assignments from courses they teach
            taught_course_ids = db.query(CourseEnrollment.course_id).filter(
                CourseEnrollment.user_id == current_user.id,
                CourseEnrollment.role_in_course == CourseRole.teacher
            ).subquery()
            query = query.filter(Assignment.course_id.in_(taught_course_ids))
        # MANAGER and ADMIN see all assignments
        
        # Get total
        total = query.count()
        
        # Pagination
        offset = (page - 1) * limit
        assignments = query.order_by(Assignment.due_at.desc()).offset(offset).limit(limit).all()
        
        # Build responses
        assignment_responses = []
        for assignment in assignments:
            try:
                submission_count = db.query(Submission).filter(
                    Submission.assignment_id == assignment.id
                ).count()
                
                # Count graded submissions - skip if table doesn't exist
                graded_count = 0
                try:
                    # Try to query grades table - if it doesn't exist, just use 0
                    graded_count = db.query(Grade).join(
                        Submission, Grade.submission_id == Submission.id
                    ).filter(
                        Submission.assignment_id == assignment.id
                    ).count()
                except Exception as e:
                    # If grades table doesn't exist or any error, just use 0
                    graded_count = 0
                
                # Get course info safely
                course = None
                try:
                    course = db.query(Course).filter(Course.id == assignment.course_id).first()
                except Exception as e:
                    print(f"[WARNING] Failed to query course {assignment.course_id}: {e}")
                    course = None
                
                # Create response using helper function to handle missing enable_plagiarism_check column
                response = build_assignment_response(
                    assignment=assignment,
                    course=course,
                    submission_count=submission_count,
                    graded_count=graded_count,
                    my_submission=None
                )
                
                assignment_responses.append(response)
            except Exception as e:
                print(f"[ERROR] Failed to build assignment response for {assignment.id}: {e}")
                import traceback
                traceback.print_exc()
                # Skip this assignment and continue
                continue
        
        return PaginatedAssignmentResponse(
            items=assignment_responses,
            total=total,
            page=page,
            limit=limit,
            pages=math.ceil(total / limit) if total > 0 else 0
        )
    except Exception as e:
        print(f"[ERROR] Failed to list assignments: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list assignments: {str(e)}"
        )


def check_course_teacher(course_id: UUID, user: User, db: Session) -> Course:
    """
    Check if user is teacher of the course or admin.
    Raises 403 if neither.
    """
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # ADMIN and MANAGER can always manage assignments
        if user.role in (UserRole.ADMIN, UserRole.MANAGER):
            return course
        
        # For TEACHER, check if they are enrolled as teacher in this course
        if user.role == UserRole.TEACHER:
            enrollment = db.query(CourseEnrollment).filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.user_id == user.id,
                CourseEnrollment.role_in_course == CourseRole.teacher
            ).first()
            if enrollment:
                return course
        
        # If we get here, user doesn't have permission
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "FORBIDDEN",
                "message": "You don't have permission to manage assignments in this course. You must be a teacher of this course, or an admin/manager.",
                "code": "RBAC_002"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in check_course_teacher: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking course permissions: {str(e)}"
        )


@router.get("/courses/{course_id}/assignments", response_model=PaginatedAssignmentResponse)
def list_assignments(
    course_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, regex="^(upcoming|ongoing|past)$", alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List assignments in a course.
    
    - **status**: Filter by status (upcoming, ongoing, past)
    - **page**: Page number
    - **limit**: Items per page
    """
    # Check access - students must be enrolled
    if current_user.role == UserRole.STUDENT:
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this course"
            )
    
    query = db.query(Assignment).filter(Assignment.course_id == course_id)
    
    # Filter by status
    now = datetime.utcnow()
    if status_filter == "upcoming":
        query = query.filter(Assignment.due_at > now)
    elif status_filter == "past":
        query = query.filter(Assignment.due_at <= now)
    
    # Get total
    total = query.count()
    
    # Pagination
    offset = (page - 1) * limit
    assignments = query.order_by(Assignment.due_at.desc()).offset(offset).limit(limit).all()
    
    # Build responses with counts
    assignment_responses = []
    for assignment in assignments:
        try:
            submission_count = db.query(Submission).filter(
                Submission.assignment_id == assignment.id
            ).count()
            
            # Count submissions that have grades - skip if table doesn't exist
            graded_count = 0
            try:
                graded_count = db.query(Grade).join(
                    Submission, Grade.submission_id == Submission.id
                ).filter(
                    Submission.assignment_id == assignment.id
                ).count()
            except Exception as e:
                # If grades table doesn't exist or any error, just use 0
                graded_count = 0
            
            # For students, include their submission
            my_submission = None
            if current_user.role == UserRole.STUDENT:
                submission = db.query(Submission).filter(
                    Submission.assignment_id == assignment.id,
                    Submission.student_id == current_user.id
                ).first()
                if submission:
                    grade = None
                    try:
                        grade = db.query(Grade).filter(Grade.submission_id == submission.id).first()
                    except:
                        grade = None
                    my_submission = {
                        "id": str(submission.id),
                        "status": submission.status.value,
                        "submitted_at": submission.submitted_at.isoformat(),
                        "grade": {
                            "score": float(grade.score) if grade else None,
                            "graded_at": grade.graded_at.isoformat() if grade else None
                        } if grade else None
                    }
            
            # Get course info
            course = db.query(Course).filter(Course.id == assignment.course_id).first()
            
            # Create response using helper function to handle missing enable_plagiarism_check column
            response = build_assignment_response(
                assignment=assignment,
                course=course,
                submission_count=submission_count,
                graded_count=graded_count,
                my_submission=my_submission
            )
            
            assignment_responses.append(response)
        except Exception as e:
            print(f"[ERROR] Failed to build assignment response for {assignment.id}: {e}")
            import traceback
            traceback.print_exc()
            # Skip this assignment and continue
            continue
    
    return PaginatedAssignmentResponse(
        items=assignment_responses,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 0
    )


@router.post("/courses/{course_id}/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    course_id: UUID,
    assignment_data: AssignmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Create a new assignment.
    
    Requires TEACHER (of the course), MANAGER, or ADMIN role.
    """
    try:
        # Check permission - must be teacher of this course or admin
        check_course_teacher(course_id, current_user, db)
        
        # Ensure due_at is timezone-aware (UTC)
        due_at = assignment_data.due_at
        if due_at.tzinfo is None:
            # If no timezone info, assume it's UTC
            due_at = due_at.replace(tzinfo=timezone.utc)
        else:
            # Convert to UTC if it has timezone info
            due_at = due_at.astimezone(timezone.utc)
        
        # Create assignment
        assignment = Assignment(
            course_id=course_id,
            title=assignment_data.title,
            description=assignment_data.description,
            due_at=due_at,
            created_by=current_user.id,
            allow_late_submission=assignment_data.allow_late_submission,
            allow_peer_review=assignment_data.allow_peer_review,
            enable_plagiarism_check=assignment_data.enable_plagiarism_check
        )
        
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        
        # Get course info for response (should exist since we checked permission)
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with id {course_id} not found"
            )
        
        # Send notifications to all enrolled students (background task)
        background_tasks.add_task(
            send_assignment_notifications,
            course_id=course_id,
            assignment_id=assignment.id,
            assignment_title=assignment.title,
            course_name=course.name,
            db_url=settings.DATABASE_URL
        )
        
        # Build response using helper function
        response = build_assignment_response(
            assignment=assignment,
            course=course,
            submission_count=0,
            graded_count=0,
            my_submission=None,
            files=[]
        )
        
        print(f"[DEBUG] AssignmentResponse created successfully with course: {response.course}")
        return response
    except HTTPException:
        # Re-raise HTTP exceptions (403, 404, etc.)
        raise
    except Exception as e:
        # Log the error and return 500
        print(f"[ERROR] Failed to create assignment: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create assignment: {str(e)}"
        )


async def send_assignment_notifications(course_id: UUID, assignment_id: UUID, assignment_title: str, course_name: str, db_url: str):
    """Background task to send notifications when assignment is created."""
    try:
        # Create new DB session for background task
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        engine = create_engine(db_url)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        # Get all enrolled students
        enrollments = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.role_in_course == CourseRole.student
        ).all()
        
        student_ids = [str(enrollment.user_id) for enrollment in enrollments]
        
        if student_ids:
            # Call notification service
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{settings.NOTIFICATION_SERVICE_URL}/notifications/create",
                    json={
                        "user_ids": student_ids,
                        "type": "ASSIGNMENT_CREATED",
                        "title": f"New Assignment: {assignment_title}",
                        "message": f"A new assignment '{assignment_title}' has been posted in {course_name}. Don't forget to submit before the deadline!",
                        "send_email": True,
                        "action_url": f"http://localhost:3000/assignments/{assignment_id}"
                    },
                    timeout=10.0
                )
        
        db.close()
    except Exception as e:
        print(f"Failed to send assignment notifications: {e}")
    except HTTPException:
        # Re-raise HTTP exceptions (403, 404, etc.)
        raise
    except Exception as e:
        # Log the error and return 500
        import traceback
        print(f"Error creating assignment: {e}")
        print(traceback.format_exc())
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create assignment: {str(e)}"
        )


@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get assignment details."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check access - students must be enrolled in the course
    if current_user.role == UserRole.STUDENT:
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == assignment.course_id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this assignment"
            )
    
    # Get course info for response
    course = db.query(Course).filter(Course.id == assignment.course_id).first()
    
    # Get counts
    submission_count = db.query(Submission).filter(
        Submission.assignment_id == assignment.id
    ).count()
    
    # Count submissions that have grades - skip if table doesn't exist
    graded_count = 0
    try:
        graded_count = db.query(Grade).join(
            Submission, Grade.submission_id == Submission.id
        ).filter(
            Submission.assignment_id == assignment.id
        ).count()
    except Exception as e:
        # If grades table doesn't exist or any error, just use 0
        graded_count = 0
    
    # For students, include their submission
    my_submission = None
    if current_user.role == UserRole.STUDENT:
        submission = db.query(Submission).filter(
            Submission.assignment_id == assignment.id,
            Submission.student_id == current_user.id
        ).first()
        if submission:
            grade = None
            try:
                grade = db.query(Grade).filter(Grade.submission_id == submission.id).first()
            except:
                grade = None
            my_submission = {
                "id": str(submission.id),
                "status": submission.status.value,
                "submitted_at": submission.submitted_at.isoformat(),
                "grade": {
                    "score": float(grade.score) if grade else None,
                    "graded_at": grade.graded_at.isoformat() if grade else None
                } if grade else None
            }
    
    # Create response using helper function to handle missing enable_plagiarism_check column
    response = build_assignment_response(
        assignment=assignment,
        course=course,
        submission_count=submission_count,
        graded_count=graded_count,
        my_submission=my_submission
    )
    
    return response


@router.put("/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(
    assignment_id: UUID,
    assignment_data: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Update assignment details.
    
    Requires course teacher or ADMIN role.
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check permission - must be teacher of the course
    check_course_teacher(assignment.course_id, current_user, db)
    
    # Update fields
    update_data = assignment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(assignment, field, value)
    
    db.commit()
    db.refresh(assignment)
    
    # Get course info for response
    course = db.query(Course).filter(Course.id == assignment.course_id).first()
    
    # Build response using helper function
    return build_assignment_response(
        assignment=assignment,
        course=course,
        submission_count=db.query(Submission).filter(Submission.assignment_id == assignment.id).count(),
        graded_count=0,  # Will be calculated if grades table exists
        my_submission=None
    )


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Delete an assignment.
    
    Requires course teacher or ADMIN role.
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check permission
    check_course_teacher(assignment.course_id, current_user, db)
    
    db.delete(assignment)
    db.commit()
    
    return None


@router.post("/{assignment_id}/files", response_model=AssignmentFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_assignment_file(
    assignment_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Upload a file for an assignment (e.g., instructions, materials).
    
    Max file size: 20MB
    Allowed types: PDF, DOCX, ZIP, TXT
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check permission
    check_course_teacher(assignment.course_id, current_user, db)
    
    # Validate file
    content = await file.read()
    file_size = len(content)
    
    if not validate_file_size(file_size):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File size exceeds maximum allowed ({settings.MAX_FILE_SIZE} bytes)"
        )
    
    if not validate_mime_type(file.content_type):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File type '{file.content_type}' not allowed"
        )
    
    # Reset file pointer
    await file.seek(0)
    
    # Save file
    file_path, saved_size = save_upload_file(file, f"assignments/{assignment_id}")
    
    # Create database record
    assignment_file = AssignmentFile(
        assignment_id=assignment_id,
        file_path=file_path,
        original_name=file.filename,
        file_size=saved_size
    )
    
    db.add(assignment_file)
    db.commit()
    db.refresh(assignment_file)
    
    return assignment_file


@router.get("/{assignment_id}/files", response_model=List[AssignmentFileResponse])
def list_assignment_files(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all files for an assignment."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check access
    if current_user.role == UserRole.STUDENT:
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == assignment.course_id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this assignment"
            )
    
    files = db.query(AssignmentFile).filter(
        AssignmentFile.assignment_id == assignment_id
    ).all()
    
    return files
