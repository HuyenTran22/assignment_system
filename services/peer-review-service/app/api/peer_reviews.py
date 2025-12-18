from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import random

from app.db import get_db
from app.core.security import get_current_user
from app.api.dependencies import require_teacher_or_manager_or_admin
from app.models.user import User, UserRole
from app.models.course import CourseEnrollment
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.peer_review import PeerReview
from app.models.notification import Notification, NotificationType
from app.schemas.peer_review import (
    PeerReviewCreate,
    PeerReviewResponse,
    PeerReviewTaskResponse,
    ReceivedPeerReviewResponse
)

router = APIRouter()


@router.post("/assignments/{assignment_id}/peer-review/assign", status_code=status.HTTP_202_ACCEPTED)
def assign_peer_reviews(
    assignment_id: UUID,
    reviews_per_submission: int = 2,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Assign peer reviews for an assignment.
    
    Requires TEACHER or ADMIN role.
    
    Logic: Each submission gets N reviewers (students who also submitted).
    Students don't review their own submission.
    
    - **reviews_per_submission**: Number of reviews per submission (default: 2)
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
                detail="You don't have permission to assign peer reviews"
            )
    
    # Check if peer review is enabled
    if not assignment.allow_peer_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Peer review is not enabled for this assignment"
        )
    
    # Get all submissions
    submissions = db.query(Submission).filter(
        Submission.assignment_id == assignment_id
    ).all()
    
    if len(submissions) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Need at least 2 submissions to assign peer reviews"
        )
    
    # Delete existing peer review assignments
    db.query(PeerReview).filter(
        PeerReview.submission_id.in_([s.id for s in submissions])
    ).delete(synchronize_session=False)
    
    # Assign reviews
    # Simple algorithm: For each submission, randomly assign N other students
    created_count = 0
    for submission in submissions:
        # Get other submissions (not this student's)
        other_submissions = [s for s in submissions if s.student_id != submission.student_id]
        
        if len(other_submissions) < reviews_per_submission:
            # Not enough other submissions, assign all available
            reviewers = other_submissions
        else:
            # Randomly select N reviewers
            reviewers = random.sample(other_submissions, reviews_per_submission)
        
        # Create peer review records
        for reviewer_submission in reviewers:
            peer_review = PeerReview(
                submission_id=submission.id,
                reviewer_id=reviewer_submission.student_id,
                score=None,
                feedback=""  # Will be filled when student submits review
            )
            db.add(peer_review)
            created_count += 1
            
            # Create notification for reviewer
            notification = Notification(
                user_id=reviewer_submission.student_id,
                type=NotificationType.PEER_REVIEW,
                title="New Peer Review Task",
                message=f"You have been assigned to review a submission for '{assignment.title}'"
            )
            db.add(notification)
    
    db.commit()
    
    return {
        "message": "Peer reviews assigned successfully",
        "total_assignments": created_count,
        "reviews_per_submission": reviews_per_submission
    }


@router.get("/assignments/{assignment_id}/peer-review/tasks", response_model=List[PeerReviewTaskResponse])
def get_peer_review_tasks(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get peer review tasks for current student.
    
    Returns list of submissions to review.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for students only"
        )
    
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Get peer reviews assigned to this student
    peer_reviews = db.query(PeerReview).filter(
        PeerReview.reviewer_id == current_user.id
    ).join(Submission).filter(
        Submission.assignment_id == assignment_id
    ).all()
    
    # Build response
    tasks = []
    for review in peer_reviews:
        submission = db.query(Submission).filter(Submission.id == review.submission_id).first()
        
        task = PeerReviewTaskResponse(
            submission_id=submission.id,
            assignment={
                "id": str(assignment.id),
                "title": assignment.title
            },
            files=[
                {
                    "id": str(f.id),
                    "original_name": f.original_name,
                    "file_size": f.file_size
                }
                for f in submission.files
            ],
            my_review=PeerReviewResponse.model_validate(review) if review.feedback else None
        )
        tasks.append(task)
    
    return tasks


@router.post("/peer-review/{submission_id}", response_model=PeerReviewResponse, status_code=status.HTTP_201_CREATED)
def submit_peer_review(
    submission_id: UUID,
    review_data: PeerReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit a peer review.
    
    Students only. Must be assigned as reviewer.
    
    - **score**: Optional score (0-100)
    - **feedback**: Required feedback text
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can submit peer reviews"
        )
    
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check if student is assigned to review this submission
    peer_review = db.query(PeerReview).filter(
        PeerReview.submission_id == submission_id,
        PeerReview.reviewer_id == current_user.id
    ).first()
    
    if not peer_review:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to review this submission"
        )
    
    # Check if trying to review own submission
    if submission.student_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot review your own submission"
        )
    
    # Update peer review
    peer_review.score = review_data.score
    peer_review.feedback = review_data.feedback
    
    db.commit()
    db.refresh(peer_review)
    
    # Create notification for submission owner
    assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
    notification = Notification(
        user_id=submission.student_id,
        type=NotificationType.PEER_REVIEW,
        title="New Peer Review Received",
        message=f"You received a peer review for your submission in '{assignment.title}'"
    )
    db.add(notification)
    db.commit()
    
    return peer_review


@router.get("/me/tasks", response_model=List[PeerReviewTaskResponse])
def get_my_peer_review_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all peer review tasks for current student.
    
    Returns list of all submissions to review across all assignments.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for students only"
        )
    
    # Get all peer reviews assigned to this student
    peer_reviews = db.query(PeerReview).filter(
        PeerReview.reviewer_id == current_user.id
    ).all()
    
    # Build response
    tasks = []
    for review in peer_reviews:
        submission = db.query(Submission).filter(Submission.id == review.submission_id).first()
        if not submission:
            continue
            
        assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
        if not assignment:
            continue
        
        # Get student info
        student = db.query(User).filter(User.id == submission.student_id).first()
        if not student:
            continue
        
        # Build task dict manually
        task_dict = {
            "submission_id": submission.id,
            "assignment": {
                "id": str(assignment.id),
                "title": assignment.title
            },
            "student": {
                "id": str(student.id),
                "full_name": student.full_name
            },
            "submitted_at": submission.submitted_at.isoformat(),
            "review_status": "completed" if review.feedback else "pending",
            "files": [
                {
                    "id": str(f.id),
                    "original_name": f.original_name,
                    "file_size": f.file_size
                }
                for f in submission.files
            ]
        }
        
        if review.feedback:
            task_dict["review"] = {
                "score": float(review.score) if review.score else None,
                "feedback": review.feedback
            }
        
        tasks.append(task_dict)
    
    return tasks


@router.get("/me/received", response_model=List[ReceivedPeerReviewResponse])
def get_my_received_peer_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all peer reviews received by current student.
    
    Returns list of all reviews on this student's submissions.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for students only"
        )
    
    # Get all submissions by this student
    my_submissions = db.query(Submission).filter(
        Submission.student_id == current_user.id
    ).all()
    
    # Get all peer reviews for these submissions
    reviews = []
    for submission in my_submissions:
        peer_reviews = db.query(PeerReview).filter(
            PeerReview.submission_id == submission.id
        ).all()
        
        assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
        if not assignment:
            continue
        
        for review in peer_reviews:
            # Skip if no feedback yet
            if not review.feedback:
                continue
                
            reviewer = db.query(User).filter(User.id == review.reviewer_id).first()
            if not reviewer:
                continue
            
            # Build response dict manually to include all required fields
            review_dict = {
                "id": review.id,
                "submission_id": review.submission_id,
                "reviewer_id": review.reviewer_id,
                "score": float(review.score) if review.score else None,
                "feedback": review.feedback,
                "created_at": review.created_at,
                "assignment": {
                    "id": str(assignment.id),
                    "title": assignment.title
                },
                "reviewer": {
                    "id": str(reviewer.id),
                    "full_name": reviewer.full_name,
                    "email": reviewer.email
                }
            }
            reviews.append(review_dict)
    
    return reviews


@router.get("/submissions/{submission_id}/peer-reviews", response_model=List[ReceivedPeerReviewResponse])
def get_peer_reviews_for_submission(
    submission_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get peer reviews received for a submission.
    
    Students can only view reviews for their own submissions.
    Teachers can view all reviews.
    """
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
                detail="You can only view peer reviews for your own submissions"
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
                detail="You don't have permission to view these reviews"
            )
    
    # Get peer reviews (only completed ones with feedback)
    peer_reviews = db.query(PeerReview).filter(
        PeerReview.submission_id == submission_id,
        PeerReview.feedback != ""
    ).all()
    
    # Build response with reviewer info and assignment
    reviews_with_reviewer = []
    for review in peer_reviews:
        reviewer = db.query(User).filter(User.id == review.reviewer_id).first()
        if not reviewer:
            continue
        
        # Get assignment info
        submission = db.query(Submission).filter(Submission.id == review.submission_id).first()
        if not submission:
            continue
            
        assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
        if not assignment:
            continue
        
        # Build complete response dict
        review_dict = {
            "id": review.id,
            "submission_id": review.submission_id,
            "reviewer_id": review.reviewer_id,
            "score": float(review.score) if review.score else None,
            "feedback": review.feedback,
            "created_at": review.created_at,
            "assignment": {
                "id": str(assignment.id),
                "title": assignment.title
            },
            "reviewer": {
                "id": str(reviewer.id),
                "full_name": reviewer.full_name,
                "email": reviewer.email
            }
        }
        
        reviews_with_reviewer.append(review_dict)
    
    return reviews_with_reviewer
