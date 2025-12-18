from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from typing import List, Optional, Tuple
from uuid import UUID
import json
import random
import httpx
from datetime import datetime, timedelta, timezone

from app.db import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.api.dependencies import require_teacher_or_manager_or_admin
from app.models.user import User, UserRole
from app.models.course import Course, CourseEnrollment, CourseRole
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt, QuizAnswer
from app.schemas.quiz import (
    QuizCreate, QuizUpdate, QuizResponse,
    QuizQuestionCreate, QuizQuestionUpdate, QuizQuestionResponse,
    QuizAttemptStart, QuizAttemptResponse, QuizSubmitRequest,
    QuizAnswerResponse, QuizAttemptDetailResponse, QuizWithQuestionsResponse,
    QuizAttemptWithQuestions, StudentQuizStatus
)
from app.api.course_materials import check_course_access

router = APIRouter(prefix="/courses", tags=["Quizzes"])


def check_quiz_access(quiz_id: UUID, user: User, db: Session, require_teacher: bool = False) -> Quiz:
    """Check if user has access to quiz."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    # Check course access
    check_course_access(quiz.course_id, user, db, require_teacher)
    
    return quiz


def auto_grade_answer(question: QuizQuestion, answer_text: str) -> Tuple[bool, float]:
    """Auto-grade a single answer."""
    is_correct = False
    points_earned = 0.0
    
    if question.question_type == "multiple_choice":
        # For multiple choice, compare exact match
        is_correct = answer_text.strip().lower() == question.correct_answer.strip().lower()
    elif question.question_type == "true_false":
        # For true/false, compare boolean values
        is_correct = answer_text.strip().lower() == question.correct_answer.strip().lower()
    elif question.question_type == "short_answer":
        # For short answer, case-insensitive comparison
        is_correct = answer_text.strip().lower() == question.correct_answer.strip().lower()
    
    if is_correct:
        points_earned = question.points
    
    return is_correct, points_earned


# Quiz CRUD
@router.post("/{course_id}/quizzes", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    course_id: UUID,
    quiz_data: QuizCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Create a new quiz (Teacher/Manager/Admin only)."""
    check_course_access(course_id, current_user, db, require_teacher=True)
    
    # Get course info
    course = db.query(Course).filter(Course.id == course_id).first()
    
    quiz = Quiz(
        course_id=course_id,
        created_by=current_user.id,
        title=quiz_data.title,
        description=quiz_data.description,
        start_time=quiz_data.start_time,
        end_time=quiz_data.end_time,
        max_attempts=quiz_data.max_attempts,
        passing_score=quiz_data.passing_score,
        is_published=quiz_data.is_published,
        shuffle_questions=quiz_data.shuffle_questions,
        due_date=quiz_data.due_date
    )
    
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    
    # Send notifications to all enrolled students (background task)
    if quiz_data.is_published:
        background_tasks.add_task(
            send_quiz_notifications,
            course_id=course_id,
            quiz_id=quiz.id,
            quiz_title=quiz.title,
            course_name=course.name if course else "Unknown Course",
            db_url=settings.DATABASE_URL
        )
    
    result = QuizResponse.model_validate(quiz)
    result.question_count = 0
    result.creator_name = current_user.full_name
    
    return result


async def send_quiz_notifications(course_id: UUID, quiz_id: UUID, quiz_title: str, course_name: str, db_url: str):
    """Background task to send notifications when quiz is created."""
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
                        "title": f"New Quiz: {quiz_title}",
                        "message": f"A new quiz '{quiz_title}' has been created in {course_name}. Check it out!",
                        "send_email": True,
                        "action_url": f"http://localhost:3000/courses/{course_id}/quizzes/{quiz_id}"
                    },
                    timeout=10.0
                )
        
        db.close()
    except Exception as e:
        print(f"Failed to send quiz notifications: {e}")


@router.get("/{course_id}/quizzes", response_model=List[QuizResponse])
def list_quizzes(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    include_unpublished: bool = False
):
    """List all quizzes in a course."""
    check_course_access(course_id, current_user, db)
    
    query = db.query(Quiz).filter(Quiz.course_id == course_id)
    
    # Students can only see published quizzes
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.user_id == current_user.id
    ).first()
    
    if enrollment and enrollment.role_in_course == CourseRole.student:
        query = query.filter(Quiz.is_published == True)
    elif not include_unpublished:
        # Teachers/Managers/Admins see all by default, but can filter
        pass
    
    quizzes = query.order_by(Quiz.created_at.desc()).all()
    
    result = []
    for quiz in quizzes:
        quiz_dict = QuizResponse.model_validate(quiz).model_dump()
        quiz_dict['question_count'] = db.query(QuizQuestion).filter(
            QuizQuestion.quiz_id == quiz.id
        ).count()
        quiz_dict['creator_name'] = quiz.creator.full_name if quiz.creator else None
        
        # Get user's submitted attempt count (for students to see if they can still attempt)
        # Only count submitted attempts, not in-progress ones
        user_attempt_count = db.query(QuizAttempt).filter(
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.user_id == current_user.id,
            QuizAttempt.submitted_at != None
        ).count()
        quiz_dict['user_attempt_count'] = user_attempt_count
        
        # Check if user has any submitted attempts (to prevent restart)
        has_submitted = user_attempt_count > 0
        quiz_dict['has_submitted'] = has_submitted
        
        result.append(QuizResponse(**quiz_dict))
    
    return result


@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
def get_quiz(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quiz details."""
    quiz = check_quiz_access(quiz_id, current_user, db)
    
    result = QuizResponse.model_validate(quiz)
    result.question_count = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz.id
    ).count()
    result.creator_name = quiz.creator.full_name if quiz.creator else None
    
    return result


@router.put("/quizzes/{quiz_id}", response_model=QuizResponse)
def update_quiz(
    quiz_id: UUID,
    quiz_data: QuizUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Update a quiz (Teacher/Manager/Admin only)."""
    quiz = check_quiz_access(quiz_id, current_user, db, require_teacher=True)
    
    update_data = quiz_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(quiz, field, value)
    
    db.commit()
    db.refresh(quiz)
    
    result = QuizResponse.model_validate(quiz)
    result.question_count = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz.id
    ).count()
    result.creator_name = quiz.creator.full_name if quiz.creator else None
    
    return result


@router.delete("/quizzes/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quiz(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Delete a quiz (Teacher/Manager/Admin only)."""
    quiz = check_quiz_access(quiz_id, current_user, db, require_teacher=True)
    
    db.delete(quiz)
    db.commit()
    
    return None


# Quiz Questions CRUD
@router.post("/quizzes/{quiz_id}/questions", response_model=QuizQuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    quiz_id: UUID,
    question_data: QuizQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Add a question to a quiz (Teacher/Manager/Admin only)."""
    quiz = check_quiz_access(quiz_id, current_user, db, require_teacher=True)
    
    # Validate question type specific requirements
    if question_data.question_type == "multiple_choice":
        if not question_data.options or len(question_data.options) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Multiple choice questions require at least 2 options"
            )
        if question_data.correct_answer not in question_data.options:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Correct answer must be one of the options"
            )
    
    # Get max order_index
    max_order = db.query(func.max(QuizQuestion.order_index)).filter(
        QuizQuestion.quiz_id == quiz_id
    ).scalar() or -1
    
    question = QuizQuestion(
        quiz_id=quiz_id,
        question_text=question_data.question_text,
        question_type=question_data.question_type,
        options=question_data.options,
        correct_answer=question_data.correct_answer,
        points=question_data.points,
        order_index=max_order + 1,
        explanation=question_data.explanation
    )
    
    db.add(question)
    db.commit()
    db.refresh(question)
    
    return QuizQuestionResponse.model_validate(question)


@router.get("/quizzes/{quiz_id}/questions", response_model=List[QuizQuestionResponse])
def list_questions(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    include_answers: bool = False
):
    """List all questions in a quiz."""
    quiz = check_quiz_access(quiz_id, current_user, db)
    
    # Check if user is teacher/admin/manager
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == quiz.course_id,
        CourseEnrollment.user_id == current_user.id
    ).first()
    
    is_teacher = enrollment and enrollment.role_in_course == CourseRole.teacher
    is_admin = current_user.role in (UserRole.ADMIN, UserRole.MANAGER)
    
    questions = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz_id
    ).order_by(QuizQuestion.order_index).all()
    
    result = []
    for question in questions:
        question_dict = QuizQuestionResponse.model_validate(question).model_dump()
        
        # Hide correct answers from students unless they've completed the quiz
        if not (is_teacher or is_admin) and not include_answers:
            question_dict['correct_answer'] = None
            question_dict['explanation'] = None
        
        result.append(QuizQuestionResponse(**question_dict))
    
    return result


@router.get("/questions/{question_id}", response_model=QuizQuestionResponse)
def get_question(
    question_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get question details."""
    question = db.query(QuizQuestion).filter(QuizQuestion.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    quiz = check_quiz_access(question.quiz_id, current_user, db)
    
    # Check if user can see answers
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == quiz.course_id,
        CourseEnrollment.user_id == current_user.id
    ).first()
    
    is_teacher = enrollment and enrollment.role_in_course == CourseRole.teacher
    is_admin = current_user.role in (UserRole.ADMIN, UserRole.MANAGER)
    
    result = QuizQuestionResponse.model_validate(question)
    
    if not (is_teacher or is_admin):
        result.correct_answer = None
        result.explanation = None
    
    return result


@router.put("/questions/{question_id}", response_model=QuizQuestionResponse)
def update_question(
    question_id: UUID,
    question_data: QuizQuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Update a question (Teacher/Manager/Admin only)."""
    question = db.query(QuizQuestion).filter(QuizQuestion.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    quiz = check_quiz_access(question.quiz_id, current_user, db, require_teacher=True)
    
    update_data = question_data.model_dump(exclude_unset=True)
    
    # Validate if updating question_type
    if 'question_type' in update_data or 'options' in update_data or 'correct_answer' in update_data:
        question_type = update_data.get('question_type', question.question_type)
        options = update_data.get('options', question.options)
        correct_answer = update_data.get('correct_answer', question.correct_answer)
        
        if question_type == "multiple_choice":
            if not options or len(options) < 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Multiple choice questions require at least 2 options"
                )
            if correct_answer not in options:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Correct answer must be one of the options"
                )
    
    for field, value in update_data.items():
        setattr(question, field, value)
    
    db.commit()
    db.refresh(question)
    
    return QuizQuestionResponse.model_validate(question)


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Delete a question (Teacher/Manager/Admin only)."""
    question = db.query(QuizQuestion).filter(QuizQuestion.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    quiz = check_quiz_access(question.quiz_id, current_user, db, require_teacher=True)
    
    db.delete(question)
    db.commit()
    
    return None


# Quiz Attempts
@router.post("/quizzes/{quiz_id}/start", response_model=QuizAttemptWithQuestions, status_code=status.HTTP_201_CREATED)
def start_quiz_attempt(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a new quiz attempt."""
    quiz = check_quiz_access(quiz_id, current_user, db)
    
    # Check if quiz is published
    if not quiz.is_published:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Quiz is not published"
        )
    
    # Check start_time and end_time (ensure timezone-aware comparison)
    now = datetime.now(timezone.utc)
    
    if quiz.start_time:
        start_time_utc = quiz.start_time
        if start_time_utc.tzinfo is None:
            # If naive datetime, assume it's already UTC
            start_time_utc = start_time_utc.replace(tzinfo=timezone.utc)
        else:
            start_time_utc = start_time_utc.astimezone(timezone.utc)
        
        # Add 1 minute buffer to account for clock differences
        if now < (start_time_utc - timedelta(minutes=1)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quiz is not available yet. It will start at {start_time_utc.strftime('%Y-%m-%d %H:%M:%S UTC')}"
            )
    
    if quiz.end_time:
        end_time_utc = quiz.end_time
        if end_time_utc.tzinfo is None:
            # If naive datetime, assume it's already UTC
            end_time_utc = end_time_utc.replace(tzinfo=timezone.utc)
        else:
            end_time_utc = end_time_utc.astimezone(timezone.utc)
        
        # Add 5 seconds buffer to account for network delay
        if now > (end_time_utc + timedelta(seconds=5)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quiz has closed. It ended at {end_time_utc.strftime('%Y-%m-%d %H:%M:%S UTC')}"
            )
    
    # Check due_date (deprecated, but keep for backward compatibility)
    if quiz.due_date:
        due_date_utc = quiz.due_date
        if due_date_utc.tzinfo is None:
            due_date_utc = due_date_utc.replace(tzinfo=timezone.utc)
        else:
            due_date_utc = due_date_utc.astimezone(timezone.utc)
        
        if now > due_date_utc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Quiz due date has passed"
            )
    
    # Check max attempts (only count submitted attempts)
    submitted_count = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.submitted_at != None
    ).count()
    
    if submitted_count >= quiz.max_attempts:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Maximum attempts ({quiz.max_attempts}) reached. You have already submitted {submitted_count} attempt(s)."
        )
    
    # Check if there's an in-progress attempt
    in_progress = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.submitted_at == None
    ).first()
    
    if in_progress:
        # Return existing attempt
        questions = db.query(QuizQuestion).filter(
            QuizQuestion.quiz_id == quiz_id
        ).order_by(QuizQuestion.order_index).all()
        
        if quiz.shuffle_questions:
            questions = random.sample(questions, len(questions))
        
        # Prepare response (hide correct answers from students)
        quiz_dict = QuizWithQuestionsResponse.model_validate(quiz).model_dump()
        question_list = []
        for q in questions:
            q_dict = QuizQuestionResponse.model_validate(q).model_dump()
            # Hide correct answers and explanations from students
            q_dict['correct_answer'] = None
            q_dict['explanation'] = None
            question_list.append(QuizQuestionResponse(**q_dict))
        quiz_dict['questions'] = question_list
        
        attempt_dict = QuizAttemptResponse.model_validate(in_progress).model_dump()
        attempt_dict['user_name'] = current_user.full_name
        
        return QuizAttemptWithQuestions(
            **attempt_dict,
            quiz=QuizWithQuestionsResponse(**quiz_dict),
            answers=[]
        )
    
    # Create new attempt (ensure timezone-aware)
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=current_user.id,
        started_at=datetime.now(timezone.utc)
    )
    
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    
    # Get questions
    questions = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz_id
    ).order_by(QuizQuestion.order_index).all()
    
    if quiz.shuffle_questions:
        questions = random.sample(questions, len(questions))
    
    # Prepare response (hide correct answers)
    quiz_dict = QuizWithQuestionsResponse.model_validate(quiz).model_dump()
    question_list = []
    for q in questions:
        q_dict = QuizQuestionResponse.model_validate(q).model_dump()
        q_dict['correct_answer'] = None
        q_dict['explanation'] = None
        question_list.append(QuizQuestionResponse(**q_dict))
    quiz_dict['questions'] = question_list
    
    attempt_dict = QuizAttemptResponse.model_validate(attempt).model_dump()
    attempt_dict['user_name'] = current_user.full_name
    
    return QuizAttemptWithQuestions(
        **attempt_dict,
        quiz=QuizWithQuestionsResponse(**quiz_dict),
        answers=[]
    )


@router.post("/quizzes/{quiz_id}/submit", response_model=QuizAttemptDetailResponse)
def submit_quiz(
    quiz_id: UUID,
    submit_data: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a quiz attempt."""
    quiz = check_quiz_access(quiz_id, current_user, db)
    
    # Find in-progress attempt
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.submitted_at == None
    ).first()
    
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active quiz attempt found. Please start a new attempt."
        )
    
    # Check end_time (ensure timezone-aware calculation)
    now = datetime.now(timezone.utc)
    
    if quiz.end_time:
        end_time_utc = quiz.end_time
        if end_time_utc.tzinfo is None:
            end_time_utc = end_time_utc.replace(tzinfo=timezone.utc)
        else:
            end_time_utc = end_time_utc.astimezone(timezone.utc)
        
        # Add small buffer (5 seconds) to account for network delay
        if now > (end_time_utc + timedelta(seconds=5)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quiz has closed. The submission deadline was {end_time_utc.strftime('%Y-%m-%d %H:%M:%S UTC')}"
            )
    
    # Get all questions
    questions = {q.id: q for q in db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz_id
    ).all()}
    
    total_points = sum(q.points for q in questions.values())
    earned_points = 0.0
    
    # Process answers
    for answer_data in submit_data.answers:
        if answer_data.question_id not in questions:
            continue
        
        question = questions[answer_data.question_id]
        is_correct, points = auto_grade_answer(question, answer_data.answer_text)
        
        answer = QuizAnswer(
            attempt_id=attempt.id,
            question_id=answer_data.question_id,
            answer_text=answer_data.answer_text,
            is_correct=is_correct,
            points_earned=points
        )
        
        db.add(answer)
        earned_points += points
    
    # Calculate score
    attempt.score = earned_points
    attempt.percentage = (earned_points / total_points * 100) if total_points > 0 else 0
    attempt.is_passed = attempt.percentage >= quiz.passing_score
    
    # Ensure timezone-aware datetime
    now_utc = datetime.now(timezone.utc)
    started_at_utc = attempt.started_at
    if started_at_utc.tzinfo is None:
        started_at_utc = started_at_utc.replace(tzinfo=timezone.utc)
    else:
        started_at_utc = started_at_utc.astimezone(timezone.utc)
    
    attempt.submitted_at = now_utc
    attempt.time_taken_seconds = int((now_utc - started_at_utc).total_seconds())
    
    db.commit()
    db.refresh(attempt)
    
    # Get answers with questions
    answers = db.query(QuizAnswer).filter(
        QuizAnswer.attempt_id == attempt.id
    ).all()
    
    answer_list = []
    for ans in answers:
        ans_dict = QuizAnswerResponse.model_validate(ans).model_dump()
        if ans.question:
            ans_dict['question'] = QuizQuestionResponse.model_validate(ans.question).model_dump()
        answer_list.append(QuizAnswerResponse(**ans_dict))
    
    attempt_dict = QuizAttemptDetailResponse.model_validate(attempt).model_dump()
    attempt_dict['answers'] = answer_list
    attempt_dict['user_name'] = current_user.full_name
    
    return QuizAttemptDetailResponse(**attempt_dict)


@router.get("/quizzes/{quiz_id}/students", response_model=List[StudentQuizStatus])
def get_quiz_students_status(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of all students in the course with their quiz attempt status."""
    quiz = check_quiz_access(quiz_id, current_user, db)
    
    # Check if user is teacher/admin/manager
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == quiz.course_id,
        CourseEnrollment.user_id == current_user.id
    ).first()
    
    is_teacher = enrollment and enrollment.role_in_course == CourseRole.teacher
    is_admin = current_user.role in (UserRole.ADMIN, UserRole.MANAGER)
    
    if not (is_teacher or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can view student quiz status"
        )
    
    # Get all students enrolled in the course
    student_enrollments = db.query(CourseEnrollment).options(
        joinedload(CourseEnrollment.user)
    ).filter(
        CourseEnrollment.course_id == quiz.course_id,
        CourseEnrollment.role_in_course == CourseRole.student
    ).all()
    
    result = []
    for enrollment in student_enrollments:
        user = enrollment.user
        if not user:
            continue
        
        # Get all attempts for this student and quiz
        attempts = db.query(QuizAttempt).filter(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.user_id == user.id
        ).order_by(QuizAttempt.started_at.desc()).all()
        
        # Calculate status
        submitted_attempts = [a for a in attempts if a.submitted_at is not None]
        has_attempted = len(attempts) > 0
        has_submitted = len(submitted_attempts) > 0
        attempt_count = len(submitted_attempts)
        
        # Get best score
        best_score = None
        best_percentage = None
        is_passed = None
        latest_attempt_date = None
        
        if submitted_attempts:
            # Find best attempt (highest percentage)
            best_attempt = max(submitted_attempts, key=lambda a: a.percentage or 0)
            best_score = best_attempt.score
            best_percentage = best_attempt.percentage
            is_passed = best_attempt.is_passed
            latest_attempt_date = best_attempt.submitted_at
        
        result.append(StudentQuizStatus(
            user_id=user.id,
            user_name=user.full_name,
            student_id=user.student_id,
            email=user.email,
            has_attempted=has_attempted,
            has_submitted=has_submitted,
            attempt_count=attempt_count,
            best_score=best_score,
            best_percentage=best_percentage,
            latest_attempt_date=latest_attempt_date,
            is_passed=is_passed
        ))
    
    # Sort by name
    result.sort(key=lambda x: x.user_name)
    
    return result


@router.get("/quizzes/{quiz_id}/attempts", response_model=List[QuizAttemptResponse])
def list_attempts(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all attempts for a quiz."""
    quiz = check_quiz_access(quiz_id, current_user, db)
    
    # Check if user can see all attempts (teacher/admin) or only their own
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == quiz.course_id,
        CourseEnrollment.user_id == current_user.id
    ).first()
    
    is_teacher = enrollment and enrollment.role_in_course == CourseRole.teacher
    is_admin = current_user.role in (UserRole.ADMIN, UserRole.MANAGER)
    
    query = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id)
    
    if not (is_teacher or is_admin):
        # Students can only see their own attempts
        query = query.filter(QuizAttempt.user_id == current_user.id)
    
    attempts = query.order_by(QuizAttempt.submitted_at.desc()).all()
    
    result = []
    for attempt in attempts:
        attempt_dict = QuizAttemptResponse.model_validate(attempt).model_dump()
        attempt_dict['user_name'] = attempt.user.full_name if attempt.user else None
        result.append(QuizAttemptResponse(**attempt_dict))
    
    return result


@router.get("/attempts/{attempt_id}", response_model=QuizAttemptDetailResponse)
def get_attempt(
    attempt_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attempt details with answers."""
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found"
        )
    
    quiz = check_quiz_access(attempt.quiz_id, current_user, db)
    
    # Check if user can view this attempt
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == quiz.course_id,
        CourseEnrollment.user_id == current_user.id
    ).first()
    
    is_teacher = enrollment and enrollment.role_in_course == CourseRole.teacher
    is_admin = current_user.role in (UserRole.ADMIN, UserRole.MANAGER)
    
    if not (is_teacher or is_admin) and attempt.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own attempts"
        )
    
    # Get answers
    answers = db.query(QuizAnswer).filter(
        QuizAnswer.attempt_id == attempt_id
    ).all()
    
    answer_list = []
    for ans in answers:
        ans_dict = QuizAnswerResponse.model_validate(ans).model_dump()
        if ans.question:
            q_dict = QuizQuestionResponse.model_validate(ans.question).model_dump()
            # Show correct answers and explanations after submission
            ans_dict['question'] = QuizQuestionResponse(**q_dict)
        answer_list.append(QuizAnswerResponse(**ans_dict))
    
    attempt_dict = QuizAttemptDetailResponse.model_validate(attempt).model_dump()
    attempt_dict['answers'] = answer_list
    attempt_dict['user_name'] = attempt.user.full_name if attempt.user else None
    
    return QuizAttemptDetailResponse(**attempt_dict)

