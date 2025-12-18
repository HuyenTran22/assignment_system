from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from pathlib import Path
from decimal import Decimal

from app.db import get_db
from app.core.security import get_current_user, require_teacher
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.course import CourseEnrollment
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.plagiarism import PlagiarismMatch
from app.schemas.plagiarism import PlagiarismReportResponse, PlagiarismMatchResponse
from app.services.plagiarism_service import compare_all_submissions

router = APIRouter()


def run_plagiarism_check(assignment_id: UUID, db: Session):
    """Background task to run plagiarism check."""
    # Get all submissions
    submissions = db.query(Submission).filter(
        Submission.assignment_id == assignment_id
    ).all()
    
    if len(submissions) < 2:
        return
    
    # Prepare file data - include ALL files from each submission
    submission_data = []
    for submission in submissions:
        if submission.files:
            # Get all files for this submission
            files = []
            for file in submission.files:
                file_path = Path(settings.UPLOAD_DIR) / file.file_path
                # Only include if file exists
                if file_path.exists():
                    files.append((str(file.id), str(file_path)))
            
            # Only include submission if it has at least one valid file
            if files:
                submission_data.append((
                    str(submission.id),
                    str(submission.student_id),
                    files
                ))
    
    if len(submission_data) < 2:
        return
    
    # Run comparison - compares all files between all submissions
    results = compare_all_submissions(submission_data)
    
    # Delete old matches for this assignment
    db.query(PlagiarismMatch).filter(
        PlagiarismMatch.assignment_id == assignment_id
    ).delete()
    
    # Store results
    for sub1_id, sub2_id, similarity in results:
        # Ensure sub1_id < sub2_id for consistency
        if sub1_id > sub2_id:
            sub1_id, sub2_id = sub2_id, sub1_id
        
        match = PlagiarismMatch(
            assignment_id=assignment_id,
            submission1_id=UUID(sub1_id),
            submission2_id=UUID(sub2_id),
            similarity_score=similarity
        )
        db.add(match)
    
    db.commit()


@router.post("/assignments/{assignment_id}/plagiarism-check", status_code=status.HTTP_202_ACCEPTED)
def trigger_plagiarism_check(
    assignment_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    """
    Trigger plagiarism check for an assignment (Teacher endpoint).
    
    Requires TEACHER or ADMIN role.
    Runs in background and compares all submissions.
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
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.role_in_course == "teacher"
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to run plagiarism check"
            )
    
    # Add background task
    background_tasks.add_task(run_plagiarism_check, assignment_id, db)
    
    return {
        "message": "Plagiarism check started",
        "assignment_id": str(assignment_id)
    }


@router.post("/internal/assignments/{assignment_id}/plagiarism-check", status_code=status.HTTP_202_ACCEPTED)
def trigger_plagiarism_check_internal(
    assignment_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Internal endpoint for triggering plagiarism check (NO AUTH).
    
    This endpoint is for service-to-service communication only.
    Should NOT be exposed publicly (use API Gateway filtering).
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Add background task
    background_tasks.add_task(run_plagiarism_check, assignment_id, db)
    
    return {
        "message": "Plagiarism check started",
        "assignment_id": str(assignment_id)
    }


@router.get("/assignments/{assignment_id}/plagiarism-report", response_model=PlagiarismReportResponse)
def get_plagiarism_report(
    assignment_id: UUID,
    threshold: float = 70.0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    """
    Get plagiarism report for an assignment.
    
    Requires TEACHER or ADMIN role.
    
    - **threshold**: Minimum similarity score to include (default: 70%)
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
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.role_in_course == "teacher"
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view plagiarism report"
            )
    
    # Get all matches
    all_matches = db.query(PlagiarismMatch).filter(
        PlagiarismMatch.assignment_id == assignment_id
    ).order_by(PlagiarismMatch.similarity_score.desc()).all()
    
    # Filter by threshold
    matches = [m for m in all_matches if float(m.similarity_score) >= threshold]
    
    # Build response with student info
    match_responses = []
    for match in matches:
        sub1 = db.query(Submission).filter(Submission.id == match.submission1_id).first()
        sub2 = db.query(Submission).filter(Submission.id == match.submission2_id).first()
        
        # Skip if submissions not found (deleted)
        if not sub1 or not sub2:
            continue
        
        student1 = db.query(User).filter(User.id == sub1.student_id).first()
        student2 = db.query(User).filter(User.id == sub2.student_id).first()
        
        # Skip if students not found
        if not student1 or not student2:
            continue
        
        # Build match response dict
        match_dict = {
            "id": match.id,
            "assignment_id": match.assignment_id,
            "submission1_id": match.submission1_id,
            "submission2_id": match.submission2_id,
            "similarity_score": match.similarity_score,
            "checked_at": match.checked_at,
            "student1": {
                "id": str(student1.id),
                "full_name": student1.full_name
            },
            "student2": {
                "id": str(student2.id),
                "full_name": student2.full_name
            }
        }
        
        match_responses.append(match_dict)
    
    # Count by severity
    high_similarity = len([m for m in all_matches if float(m.similarity_score) > 70])
    medium_similarity = len([m for m in all_matches if 50 <= float(m.similarity_score) <= 70])
    
    # Get total submissions
    total_submissions = db.query(Submission).filter(
        Submission.assignment_id == assignment_id
    ).count()
    
    return PlagiarismReportResponse(
        assignment_id=assignment_id,
        total_submissions=total_submissions,
        total_comparisons=len(all_matches),
        matches=match_responses,
        high_similarity_count=high_similarity,
        medium_similarity_count=medium_similarity
    )


@router.get("/submissions/{submission_id}/plagiarism-report")
def get_submission_plagiarism_matches(
    submission_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    """
    Get plagiarism matches for a specific submission.
    
    Requires TEACHER or ADMIN role.
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
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.role_in_course == "teacher"
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view plagiarism matches"
            )
    
    # Get matches involving this submission
    matches = db.query(PlagiarismMatch).filter(
        (PlagiarismMatch.submission1_id == submission_id) |
        (PlagiarismMatch.submission2_id == submission_id)
    ).order_by(PlagiarismMatch.similarity_score.desc()).all()
    
    # Build response
    match_list = []
    for match in matches:
        # Determine which is the other submission
        other_sub_id = match.submission2_id if match.submission1_id == submission_id else match.submission1_id
        other_sub = db.query(Submission).filter(Submission.id == other_sub_id).first()
        other_student = db.query(User).filter(User.id == other_sub.student_id).first()
        
        match_list.append({
            "match_id": str(match.id),
            "other_submission_id": str(other_sub_id),
            "other_student": {
                "id": str(other_student.id),
                "full_name": other_student.full_name
            },
            "similarity_score": float(match.similarity_score),
            "checked_at": match.checked_at.isoformat()
        })
    
    return {
        "submission_id": str(submission_id),
        "matches": match_list
    }
