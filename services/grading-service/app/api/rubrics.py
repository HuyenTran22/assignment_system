from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from decimal import Decimal

from app.db import get_db
from app.core.security import get_current_user, require_teacher
from app.models.user import User, UserRole
from app.models.course import CourseEnrollment
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.rubric import Rubric, RubricItem, RubricScore
from app.models.grade import Grade
from app.models.notification import Notification, NotificationType
from app.schemas.rubric import (
    RubricCreate,
    RubricResponse,
    RubricGradingRequest,
    RubricGradingResponse,
    RubricScoreResponse
)

router = APIRouter()


def check_course_teacher(course_id: UUID, user: User, db: Session):
    """Check if user is teacher of the course."""
    if user.role != UserRole.ADMIN:
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.user_id == user.id,
            CourseEnrollment.role_in_course == "teacher"
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to manage rubrics in this course"
            )


@router.post("/assignments/{assignment_id}/rubric", response_model=RubricResponse, status_code=status.HTTP_201_CREATED)
def create_rubric(
    assignment_id: UUID,
    rubric_data: RubricCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    """
    Create a rubric for an assignment.
    
    Requires TEACHER or ADMIN role.
    
    - **title**: Rubric title
    - **items**: List of rubric items with description, max_score, weight, order_index
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check permission
    check_course_teacher(assignment.course_id, current_user, db)
    
    # Check if rubric already exists
    existing_rubric = db.query(Rubric).filter(Rubric.assignment_id == assignment_id).first()
    if existing_rubric:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rubric already exists for this assignment. Use PUT to update."
        )
    
    # Create rubric
    rubric = Rubric(
        assignment_id=assignment_id,
        title=rubric_data.title
    )
    
    db.add(rubric)
    db.commit()
    db.refresh(rubric)
    
    # Create rubric items
    for item_data in rubric_data.items:
        item = RubricItem(
            rubric_id=rubric.id,
            description=item_data.description,
            max_score=item_data.max_score,
            weight=item_data.weight,
            order_index=item_data.order_index
        )
        db.add(item)
    
    db.commit()
    db.refresh(rubric)
    
    return rubric


@router.get("/assignments/{assignment_id}/rubric", response_model=RubricResponse)
def get_rubric(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get rubric for an assignment.
    
    Available to all enrolled users.
    """
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
    
    rubric = db.query(Rubric).filter(Rubric.assignment_id == assignment_id).first()
    if not rubric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rubric not found for this assignment"
        )
    
    return rubric


@router.put("/rubrics/{rubric_id}", response_model=RubricResponse)
def update_rubric(
    rubric_id: UUID,
    rubric_data: RubricCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    """
    Update a rubric.
    
    Requires TEACHER or ADMIN role.
    """
    rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
    if not rubric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rubric not found"
        )
    
    # Check permission
    assignment = db.query(Assignment).filter(Assignment.id == rubric.assignment_id).first()
    check_course_teacher(assignment.course_id, current_user, db)
    
    # Update title
    rubric.title = rubric_data.title
    
    # Delete old items
    db.query(RubricItem).filter(RubricItem.rubric_id == rubric_id).delete()
    
    # Create new items
    for item_data in rubric_data.items:
        item = RubricItem(
            rubric_id=rubric.id,
            description=item_data.description,
            max_score=item_data.max_score,
            weight=item_data.weight,
            order_index=item_data.order_index
        )
        db.add(item)
    
    db.commit()
    db.refresh(rubric)
    
    return rubric


@router.post("/submissions/{submission_id}/rubric-scores", response_model=RubricGradingResponse, status_code=status.HTTP_201_CREATED)
def grade_with_rubric(
    submission_id: UUID,
    grading_data: RubricGradingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    """
    Grade a submission using rubric.
    
    Automatically calculates total score and creates grade.
    
    - **scores**: List of scores for each rubric item
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check permission
    assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
    check_course_teacher(assignment.course_id, current_user, db)
    
    # Get rubric
    rubric = db.query(Rubric).filter(Rubric.assignment_id == assignment.id).first()
    if not rubric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No rubric found for this assignment"
        )
    
    # Validate all rubric items are scored
    rubric_items = db.query(RubricItem).filter(RubricItem.rubric_id == rubric.id).all()
    scored_item_ids = {score.rubric_item_id for score in grading_data.scores}
    rubric_item_ids = {item.id for item in rubric_items}
    
    if scored_item_ids != rubric_item_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All rubric items must be scored"
        )
    
    # Delete existing rubric scores if any
    db.query(RubricScore).filter(RubricScore.submission_id == submission_id).delete()
    
    # Create rubric scores
    rubric_scores = []
    for score_data in grading_data.scores:
        # Validate score against max_score
        item = db.query(RubricItem).filter(RubricItem.id == score_data.rubric_item_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Rubric item {score_data.rubric_item_id} not found"
            )
        
        if score_data.score > item.max_score:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Score {score_data.score} exceeds max score {item.max_score} for item '{item.description}'"
            )
        
        rubric_score = RubricScore(
            rubric_item_id=score_data.rubric_item_id,
            submission_id=submission_id,
            score=score_data.score,
            comment=score_data.comment
        )
        db.add(rubric_score)
        rubric_scores.append(rubric_score)
    
    db.commit()
    
    # Calculate total score
    # Formula: SUM(score * weight) / SUM(max_score * weight) * 100
    total_weighted_score = Decimal("0")
    total_weighted_max = Decimal("0")
    
    for score_data in grading_data.scores:
        item = db.query(RubricItem).filter(RubricItem.id == score_data.rubric_item_id).first()
        total_weighted_score += score_data.score * item.weight
        total_weighted_max += item.max_score * item.weight
    
    if total_weighted_max > 0:
        total_score = (total_weighted_score / total_weighted_max) * Decimal("100")
    else:
        total_score = Decimal("0")
    
    # Round to 2 decimal places
    total_score = total_score.quantize(Decimal("0.01"))
    
    # Create or update grade
    existing_grade = db.query(Grade).filter(Grade.submission_id == submission_id).first()
    if existing_grade:
        existing_grade.score = total_score
        existing_grade.grader_id = current_user.id
        grade = existing_grade
    else:
        grade = Grade(
            submission_id=submission_id,
            grader_id=current_user.id,
            score=total_score,
            feedback_text="Graded using rubric"
        )
        db.add(grade)
    
    db.commit()
    db.refresh(grade)
    
    # Refresh rubric scores to get IDs
    for score in rubric_scores:
        db.refresh(score)
    
    # Create notification
    notification = Notification(
        user_id=submission.student_id,
        type=NotificationType.GRADE,
        title="New Grade Available",
        message=f"Your submission for '{assignment.title}' has been graded using rubric. Score: {total_score}/100"
    )
    db.add(notification)
    db.commit()
    
    return RubricGradingResponse(
        submission_id=submission_id,
        rubric_scores=rubric_scores,
        total_score=total_score,
        grade_id=grade.id
    )


@router.get("/submissions/{submission_id}/rubric-scores", response_model=List[RubricScoreResponse])
def get_rubric_scores(
    submission_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get rubric scores for a submission.
    
    Students can only view their own scores.
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
                detail="You can only view your own rubric scores"
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
                detail="You don't have permission to view these scores"
            )
    
    scores = db.query(RubricScore).filter(RubricScore.submission_id == submission_id).all()
    
    return scores
