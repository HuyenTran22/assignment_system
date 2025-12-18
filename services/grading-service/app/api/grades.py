from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from decimal import Decimal

from app.db import get_db
from app.core.security import get_current_user
from app.api.dependencies import require_teacher_or_manager_or_admin
from app.models.user import User, UserRole
from app.models.course import CourseEnrollment
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.grade import Grade
from app.models.notification import Notification, NotificationType
from app.schemas.grade import (
    GradeCreate,
    GradeUpdate,
    GradeResponse,
    GradeWithAssignmentResponse
)

router = APIRouter()


def create_grade_notification(db: Session, student_id: UUID, assignment_title: str, score: Decimal):
    """Create notification for student when graded."""
    notification = Notification(
        user_id=student_id,
        type=NotificationType.GRADE,
        title="New Grade Available",
        message=f"Your submission for '{assignment_title}' has been graded. Score: {score}/100"
    )
    db.add(notification)
    db.commit()


@router.post("/submissions/{submission_id}/grade", response_model=GradeResponse, status_code=status.HTTP_201_CREATED)
def grade_submission(
    submission_id: UUID,
    grade_data: GradeCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Grade a submission.
    
    Requires TEACHER, MANAGER, or ADMIN role.
    Creates notification for student.
    
    - **score**: Score (0-100, up to 2 decimal places)
    - **feedback_text**: Optional feedback
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check permission
    assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
    if current_user.role != UserRole.ADMIN:
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == assignment.course_id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        if not enrollment or enrollment.role_in_course != "teacher":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to grade this submission"
            )
    
    # Check if already graded
    existing_grade = db.query(Grade).filter(Grade.submission_id == submission_id).first()
    if existing_grade:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission already graded. Use PUT to update the grade."
        )
    
    # Create grade
    grade = Grade(
        submission_id=submission_id,
        grader_id=current_user.id,
        score=grade_data.score,
        feedback_text=grade_data.feedback_text
    )
    
    db.add(grade)
    db.commit()
    db.refresh(grade)
    
    # Create notification (in background)
    background_tasks.add_task(
        create_grade_notification,
        db,
        submission.student_id,
        assignment.title,
        grade_data.score
    )
    
    return grade


@router.put("/grades/{grade_id}", response_model=GradeResponse)
def update_grade(
    grade_id: UUID,
    grade_data: GradeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Update a grade.
    
    Requires TEACHER, MANAGER, or ADMIN role.
    """
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grade not found"
        )
    
    # Check permission
    submission = db.query(Submission).filter(Submission.id == grade.submission_id).first()
    assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
    
    if current_user.role != UserRole.ADMIN:
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == assignment.course_id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        if not enrollment or enrollment.role_in_course != "teacher":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this grade"
            )
    
    # Update fields
    update_data = grade_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(grade, field, value)
    
    db.commit()
    db.refresh(grade)
    
    return grade


@router.get("/students/me/grades", response_model=List[GradeWithAssignmentResponse])
def get_my_grades(
    course_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all grades for the current student.
    
    - **course_id**: Optional filter by course
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for students only"
        )
    
    query = db.query(Grade).join(Submission).filter(
        Submission.student_id == current_user.id
    )
    
    # Filter by course
    if course_id:
        query = query.join(Assignment).filter(Assignment.course_id == course_id)
    
    grades = query.order_by(Grade.graded_at.desc()).all()
    
    # Build responses with assignment info
    grade_responses = []
    for grade in grades:
        submission = db.query(Submission).filter(Submission.id == grade.submission_id).first()
        assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
        
        grade_dict = GradeResponse.model_validate(grade).model_dump()
        grade_dict['assignment'] = {
            "id": str(assignment.id),
            "title": assignment.title,
            "due_at": assignment.due_at.isoformat()
        }
        grade_dict['submission'] = {
            "id": str(submission.id),
            "submitted_at": submission.submitted_at.isoformat(),
            "status": submission.status.value
        }
        
        grade_responses.append(GradeWithAssignmentResponse(**grade_dict))
    
    return grade_responses


@router.get("/assignments/{assignment_id}/grades/me", response_model=Optional[GradeResponse])
def get_my_grade_for_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get grade for a specific assignment (student view).
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for students only"
        )
    
    # Find submission
    submission = db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == current_user.id
    ).first()
    
    if not submission:
        return None
    
    # Find grade
    grade = db.query(Grade).filter(Grade.submission_id == submission.id).first()
    
    return grade


@router.get("/courses/{course_id}/grades", response_model=List[GradeWithAssignmentResponse])
def get_course_grades(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Get all grades for a course (teacher view).
    
    Requires TEACHER, MANAGER, or ADMIN role.
    """
    # Check permission
    if current_user.role != UserRole.ADMIN:
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        if not enrollment or enrollment.role_in_course != "teacher":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view grades for this course"
            )
    
    # Get all grades for assignments in this course
    query = db.query(Grade).join(Submission).join(Assignment).filter(
        Assignment.course_id == course_id
    )
    
    grades = query.order_by(Grade.graded_at.desc()).all()
    
    # Build responses with assignment and student info
    grade_responses = []
    for grade in grades:
        submission = db.query(Submission).filter(Submission.id == grade.submission_id).first()
        assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
        student = db.query(User).filter(User.id == submission.student_id).first()
        grader = db.query(User).filter(User.id == grade.grader_id).first()
        
        grade_dict = GradeResponse.model_validate(grade).model_dump()
        grade_dict['submission'] = {
            "id": str(submission.id),
            "submitted_at": submission.submitted_at.isoformat(),
            "status": submission.status.value,
            "student": {
                "id": str(student.id),
                "full_name": student.full_name,
                "email": student.email,
                "student_id": student.student_id
            }
        }
        grade_dict['assignment'] = {
            "id": str(assignment.id),
            "title": assignment.title,
            "due_at": assignment.due_at.isoformat(),
            "course": {
                "id": str(course_id),
                "name": "",  # Will be filled by frontend
                "code": ""
            }
        }
        grade_dict['grader'] = {
            "id": str(grader.id),
            "full_name": grader.full_name
        } if grader else None
        
        grade_responses.append(GradeWithAssignmentResponse(**grade_dict))
    
    return grade_responses


@router.get("/courses/{course_id}/grades/me", response_model=List[GradeWithAssignmentResponse])
def get_my_course_grades(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current student's grades for a specific course.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for students only"
        )
    
    # Get all grades for assignments in this course for current student
    query = db.query(Grade).join(Submission).join(Assignment).filter(
        Assignment.course_id == course_id,
        Submission.student_id == current_user.id
    )
    
    grades = query.order_by(Grade.graded_at.desc()).all()
    
    # Build responses with assignment info
    grade_responses = []
    for grade in grades:
        submission = db.query(Submission).filter(Submission.id == grade.submission_id).first()
        assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
        
        grade_dict = GradeResponse.model_validate(grade).model_dump()
        grade_dict['assignment'] = {
            "id": str(assignment.id),
            "title": assignment.title,
            "due_at": assignment.due_at.isoformat(),
            "course": {
                "id": str(course_id),
                "name": "",
                "code": ""
            }
        }
        grade_dict['submission'] = {
            "id": str(submission.id),
            "submitted_at": submission.submitted_at.isoformat(),
            "status": submission.status.value
        }
        
        grade_responses.append(GradeWithAssignmentResponse(**grade_dict))
    
    return grade_responses


@router.get("/assignments/{assignment_id}/grades/statistics")
def get_grade_statistics(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Get grade statistics for an assignment.
    
    Requires TEACHER, MANAGER, or ADMIN role.
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
                detail="You don't have permission to view statistics"
            )
    
    # Get all grades for this assignment
    grades = db.query(Grade).join(Submission).filter(
        Submission.assignment_id == assignment_id
    ).all()
    
    if not grades:
        return {
            "total_submissions": 0,
            "total_graded": 0,
            "average_score": None,
            "min_score": None,
            "max_score": None
        }
    
    scores = [float(grade.score) for grade in grades]
    total_submissions = db.query(Submission).filter(
        Submission.assignment_id == assignment_id
    ).count()
    
    return {
        "total_submissions": total_submissions,
        "total_graded": len(grades),
        "average_score": sum(scores) / len(scores),
        "min_score": min(scores),
        "max_score": max(scores)
    }
