from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, case
from typing import Dict, List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from app.db import get_db
from app.core.security import get_current_user
from app.api.dependencies import require_teacher_or_manager_or_admin
from app.models.user import User, UserRole
from app.models.course import Course, CourseEnrollment, CourseRole
from app.models.quiz import Quiz, QuizAttempt
from app.models.live_class import LiveSession, SessionAttendance
from app.api.course_materials import check_course_access

router = APIRouter(prefix="/courses", tags=["Analytics"])


@router.get("/{course_id}/analytics/overview")
def get_course_overview(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get course overview analytics."""
    check_course_access(course_id, current_user, db)
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Get enrollment stats
    total_students = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.role_in_course == CourseRole.student
    ).count()
    
    total_teachers = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.role_in_course == CourseRole.teacher
    ).count()
    
    # Get quiz stats
    total_quizzes = db.query(Quiz).filter(Quiz.course_id == course_id).count()
    published_quizzes = db.query(Quiz).filter(
        Quiz.course_id == course_id,
        Quiz.is_published == True
    ).count()
    
    # Get live session stats
    total_sessions = db.query(LiveSession).filter(LiveSession.course_id == course_id).count()
    completed_sessions = db.query(LiveSession).filter(
        LiveSession.course_id == course_id,
        LiveSession.status == "completed"
    ).count()
    
    # Get quiz attempt stats
    total_attempts = db.query(QuizAttempt).join(Quiz).filter(
        Quiz.course_id == course_id
    ).count()
    
    avg_score = db.query(func.avg(QuizAttempt.percentage)).join(Quiz).filter(
        Quiz.course_id == course_id,
        QuizAttempt.percentage != None
    ).scalar()
    
    return {
        "course_id": str(course_id),
        "course_name": course.name,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_quizzes": total_quizzes,
        "published_quizzes": published_quizzes,
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "total_quiz_attempts": total_attempts,
        "average_quiz_score": float(avg_score) if avg_score else None
    }


@router.get("/{course_id}/analytics/student/{student_id}")
def get_student_analytics(
    course_id: UUID,
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get analytics for a specific student."""
    check_course_access(course_id, current_user, db)
    
    # Check if student is enrolled
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.user_id == student_id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not enrolled in this course"
        )
    
    # Get quiz attempts
    quiz_attempts = db.query(QuizAttempt).join(Quiz).filter(
        Quiz.course_id == course_id,
        QuizAttempt.user_id == student_id
    ).all()
    
    quiz_stats = {
        "total_attempts": len(quiz_attempts),
        "completed_attempts": len([a for a in quiz_attempts if a.submitted_at]),
        "average_score": None,
        "highest_score": None,
        "lowest_score": None,
        "passed_quizzes": len([a for a in quiz_attempts if a.is_passed == True])
    }
    
    if quiz_attempts:
        scores = [a.percentage for a in quiz_attempts if a.percentage is not None]
        if scores:
            quiz_stats["average_score"] = sum(scores) / len(scores)
            quiz_stats["highest_score"] = max(scores)
            quiz_stats["lowest_score"] = min(scores)
    
    # Get attendance stats
    attendance_records = db.query(SessionAttendance).join(LiveSession).filter(
        LiveSession.course_id == course_id,
        SessionAttendance.user_id == student_id
    ).all()
    
    attendance_stats = {
        "total_sessions_attended": len(attendance_records),
        "total_duration_minutes": sum([a.duration_minutes or 0 for a in attendance_records]),
        "average_duration_minutes": None
    }
    
    if attendance_records:
        durations = [a.duration_minutes for a in attendance_records if a.duration_minutes]
        if durations:
            attendance_stats["average_duration_minutes"] = sum(durations) / len(durations)
    
    return {
        "student_id": str(student_id),
        "course_id": str(course_id),
        "quiz_stats": quiz_stats,
        "attendance_stats": attendance_stats
    }


@router.get("/{course_id}/analytics/quizzes")
def get_quiz_analytics(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quiz analytics for a course."""
    check_course_access(course_id, current_user, db)
    
    quizzes = db.query(Quiz).filter(Quiz.course_id == course_id).all()
    
    quiz_analytics = []
    for quiz in quizzes:
        attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id).all()
        
        stats = {
            "quiz_id": str(quiz.id),
            "quiz_title": quiz.title,
            "total_attempts": len(attempts),
            "completed_attempts": len([a for a in attempts if a.submitted_at]),
            "average_score": None,
            "pass_rate": None,
            "total_participants": len(set([a.user_id for a in attempts]))
        }
        
        if attempts:
            scores = [a.percentage for a in attempts if a.percentage is not None]
            if scores:
                stats["average_score"] = sum(scores) / len(scores)
            
            passed = len([a for a in attempts if a.is_passed == True])
            if len(attempts) > 0:
                stats["pass_rate"] = (passed / len(attempts)) * 100
        
        quiz_analytics.append(stats)
    
    return {
        "course_id": str(course_id),
        "quizzes": quiz_analytics
    }


@router.get("/{course_id}/analytics/attendance")
def get_attendance_analytics(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance analytics for a course."""
    check_course_access(course_id, current_user, db)
    
    sessions = db.query(LiveSession).filter(LiveSession.course_id == course_id).all()
    
    session_analytics = []
    for session in sessions:
        attendance = db.query(SessionAttendance).filter(
            SessionAttendance.session_id == session.id
        ).all()
        
        stats = {
            "session_id": str(session.id),
            "session_title": session.title,
            "scheduled_start": session.scheduled_start.isoformat(),
            "status": session.status,
            "total_participants": len(attendance),
            "average_duration_minutes": None
        }
        
        if attendance:
            durations = [a.duration_minutes for a in attendance if a.duration_minutes]
            if durations:
                stats["average_duration_minutes"] = sum(durations) / len(durations)
        
        session_analytics.append(stats)
    
    return {
        "course_id": str(course_id),
        "sessions": session_analytics
    }


@router.get("/analytics/dashboard")
async def get_user_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard analytics for current user."""
    import httpx
    from app.core.config import settings
    
    # Get Authorization header from request to forward to other services
    auth_header = request.headers.get("Authorization")
    headers = {}
    if auth_header:
        headers["Authorization"] = auth_header
    
    # Get user's enrollments
    enrollments = db.query(CourseEnrollment).filter(
        CourseEnrollment.user_id == current_user.id
    ).all()
    
    course_ids = [e.course_id for e in enrollments]
    
    # Get courses user is enrolled in
    courses = db.query(Course).filter(Course.id.in_(course_ids)).all() if course_ids else []
    
    # Calculate courses count
    total_courses = len(courses)
    
    # Initialize stats
    total_assignments = 0
    total_submissions = 0
    to_grade_count = 0
    completed_count = 0
    avg_grade = None
    
    # Get assignments and submissions stats from assignment-service
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            assignment_url = f"{settings.ASSIGNMENT_SERVICE_URL}/assignments"
            
            # Try to get assignments
            try:
                assignment_response = await client.get(
                    assignment_url,
                    headers=headers,
                    params={"limit": 1000}  # Get all assignments
                )
                if assignment_response.status_code == 200:
                    assignment_data = assignment_response.json()
                    assignments = assignment_data.get("items", [])
                    
                    if current_user.role == UserRole.TEACHER:
                        # For teacher: count assignments they created
                        total_assignments = len([a for a in assignments if a.get("created_by") == str(current_user.id)])
                        
                        # Count submissions for teacher's assignments
                        for assignment in assignments:
                            if assignment.get("created_by") == str(current_user.id):
                                total_submissions += assignment.get("submission_count", 0)
                                graded_count = assignment.get("graded_count", 0)
                                submission_count = assignment.get("submission_count", 0)
                                to_grade_count += (submission_count - graded_count)
                    else:
                        # For student: count assignments in their courses
                        total_assignments = len([a for a in assignments if str(a.get("course_id")) in [str(cid) for cid in course_ids]])
                        
                        # Count completed submissions
                        for assignment in assignments:
                            if str(assignment.get("course_id")) in [str(cid) for cid in course_ids]:
                                my_submission = assignment.get("my_submission")
                                if my_submission and my_submission.get("status") == "submitted":
                                    completed_count += 1
            except Exception as e:
                print(f"[Dashboard] Error fetching assignments: {e}")
    except Exception as e:
        print(f"[Dashboard] Error connecting to assignment service: {e}")
    
    # Get grades stats from grading-service (for students)
    if current_user.role == UserRole.STUDENT:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                grades_url = f"{settings.GRADING_SERVICE_URL}/students/me/grades"
                
                try:
                    grades_response = await client.get(grades_url, headers=headers)
                    if grades_response.status_code == 200:
                        grades = grades_response.json()
                        if grades:
                            scores = [g.get("score", 0) for g in grades if g.get("score") is not None]
                            if scores:
                                avg_grade = sum(scores) / len(scores)
                except Exception as e:
                    print(f"[Dashboard] Error fetching grades: {e}")
        except Exception as e:
            print(f"[Dashboard] Error connecting to grading service: {e}")
    
    # Get quiz attempts
    quiz_attempts = db.query(QuizAttempt).join(Quiz).filter(
        Quiz.course_id.in_(course_ids),
        QuizAttempt.user_id == current_user.id
    ).all() if course_ids else []
    
    # Get attendance
    attendance = db.query(SessionAttendance).join(LiveSession).filter(
        LiveSession.course_id.in_(course_ids),
        SessionAttendance.user_id == current_user.id
    ).all() if course_ids else []
    
    # Calculate quiz stats
    total_quiz_attempts = len(quiz_attempts)
    completed_quizzes = len([a for a in quiz_attempts if a.submitted_at])
    avg_quiz_score = None
    
    if quiz_attempts:
        scores = [a.percentage for a in quiz_attempts if a.percentage is not None]
        if scores:
            avg_quiz_score = sum(scores) / len(scores)
    
    total_sessions_attended = len(attendance)
    total_attendance_minutes = sum([a.duration_minutes or 0 for a in attendance])
    
    # Get courses with basic info
    courses_list = []
    for course in courses:
        enrollment = next((e for e in enrollments if e.course_id == course.id), None)
        role_in_course = enrollment.role_in_course.value if enrollment else None
        
        # Get student count (for teachers)
        student_count = 0
        if current_user.role == UserRole.TEACHER and role_in_course == "teacher":
            student_count = db.query(CourseEnrollment).filter(
                CourseEnrollment.course_id == course.id,
                CourseEnrollment.role_in_course == CourseRole.student
            ).count()
        
        # Get quiz count
        quiz_count = db.query(Quiz).filter(Quiz.course_id == course.id).count()
        
        # Get material count
        from app.models.course_material import CourseMaterial
        material_count = db.query(CourseMaterial).filter(CourseMaterial.course_id == course.id).count()
        
        courses_list.append({
            "id": str(course.id),
            "name": course.name,
            "code": course.code,
            "description": course.description,
            "role_in_course": role_in_course,
            "student_count": student_count,
            "quiz_count": quiz_count,
            "material_count": material_count
        })
    
    # Get upcoming quizzes (for students) or quizzes needing attention (for teachers)
    now = datetime.utcnow()
    upcoming_quizzes = []
    if current_user.role == UserRole.STUDENT:
        upcoming_quizzes_query = db.query(Quiz).filter(
            Quiz.course_id.in_(course_ids),
            Quiz.is_published == True,
            Quiz.start_time > now,
            Quiz.end_time > now
        ).order_by(Quiz.start_time.asc()).limit(5).all()
        
        for quiz in upcoming_quizzes_query:
            # Check if student has already submitted
            has_submitted = db.query(QuizAttempt).filter(
                QuizAttempt.quiz_id == quiz.id,
                QuizAttempt.user_id == current_user.id,
                QuizAttempt.submitted_at != None
            ).first() is not None
            
            upcoming_quizzes.append({
                "id": str(quiz.id),
                "title": quiz.title,
                "course_id": str(quiz.course_id),
                "course_name": next((c.name for c in courses if c.id == quiz.course_id), ""),
                "start_time": quiz.start_time.isoformat() if quiz.start_time else None,
                "end_time": quiz.end_time.isoformat() if quiz.end_time else None,
                "has_submitted": has_submitted
            })
    else:
        # For teachers: quizzes with upcoming deadlines or needing attention
        upcoming_quizzes_query = db.query(Quiz).filter(
            Quiz.course_id.in_(course_ids),
            Quiz.end_time > now
        ).order_by(Quiz.end_time.asc()).limit(5).all()
        
        for quiz in upcoming_quizzes_query:
            # Count students who haven't submitted
            total_students = db.query(CourseEnrollment).filter(
                CourseEnrollment.course_id == quiz.course_id,
                CourseEnrollment.role_in_course == CourseRole.student
            ).count()
            
            submitted_students = db.query(QuizAttempt).filter(
                QuizAttempt.quiz_id == quiz.id,
                QuizAttempt.submitted_at != None
            ).distinct(QuizAttempt.user_id).count()
            
            upcoming_quizzes.append({
                "id": str(quiz.id),
                "title": quiz.title,
                "course_id": str(quiz.course_id),
                "course_name": next((c.name for c in courses if c.id == quiz.course_id), ""),
                "end_time": quiz.end_time.isoformat() if quiz.end_time else None,
                "total_students": total_students,
                "submitted_students": submitted_students
            })
    
    # Get recent activities (quiz attempts, submissions, etc.)
    recent_activities = []
    
    # Recent quiz attempts
    if current_user.role == UserRole.STUDENT:
        recent_attempts = db.query(QuizAttempt).options(
            joinedload(QuizAttempt.quiz),
            joinedload(QuizAttempt.user)
        ).join(Quiz).filter(
            Quiz.course_id.in_(course_ids),
            QuizAttempt.user_id == current_user.id
        ).order_by(QuizAttempt.started_at.desc()).limit(5).all()
    else:
        recent_attempts = db.query(QuizAttempt).options(
            joinedload(QuizAttempt.quiz),
            joinedload(QuizAttempt.user)
        ).join(Quiz).filter(
            Quiz.course_id.in_(course_ids)
        ).order_by(QuizAttempt.started_at.desc()).limit(5).all()
    
    for attempt in recent_attempts:
        quiz = attempt.quiz
        if not quiz:
            continue
        course = next((c for c in courses if c.id == quiz.course_id), None)
        if course:
            if current_user.role == UserRole.STUDENT:
                recent_activities.append({
                    "type": "quiz_attempt",
                    "title": f"Completed quiz: {quiz.title}",
                    "course_name": course.name,
                    "score": attempt.percentage,
                    "timestamp": attempt.submitted_at.isoformat() if attempt.submitted_at else (attempt.started_at.isoformat() if attempt.started_at else datetime.utcnow().isoformat())
                })
            else:
                # For teachers: show student attempts
                student = attempt.user
                if student:
                    recent_activities.append({
                        "type": "quiz_submission",
                        "title": f"{student.full_name} submitted: {quiz.title}",
                        "course_name": course.name,
                        "score": attempt.percentage,
                        "timestamp": attempt.submitted_at.isoformat() if attempt.submitted_at else (attempt.started_at.isoformat() if attempt.started_at else datetime.utcnow().isoformat())
                    })
    
    # Get certificates (for students)
    certificates_count = 0
    if current_user.role == UserRole.STUDENT:
        from app.models.certificate import Certificate
        certificates_count = db.query(Certificate).filter(
            Certificate.user_id == current_user.id
        ).count()
    
    # Get total students across all courses (for teachers)
    total_students = 0
    if current_user.role == UserRole.TEACHER:
        teacher_course_ids = [e.course_id for e in enrollments if e.role_in_course == CourseRole.teacher]
        if teacher_course_ids:
            total_students = db.query(CourseEnrollment).filter(
                CourseEnrollment.course_id.in_(teacher_course_ids),
                CourseEnrollment.role_in_course == CourseRole.student
            ).distinct(CourseEnrollment.user_id).count()
    
    return {
        "user_id": str(current_user.id),
        "role": current_user.role.value,
        "total_courses": total_courses,
        "total_assignments": total_assignments,
        "total_submissions": total_submissions if current_user.role == UserRole.TEACHER else completed_count,
        "to_grade": to_grade_count if current_user.role == UserRole.TEACHER else None,
        "avg_grade": avg_grade if current_user.role == UserRole.STUDENT else None,
        "total_quiz_attempts": total_quiz_attempts,
        "completed_quizzes": completed_quizzes,
        "average_quiz_score": avg_quiz_score,
        "total_sessions_attended": total_sessions_attended,
        "total_attendance_minutes": total_attendance_minutes,
        "courses": courses_list,
        "upcoming_quizzes": upcoming_quizzes,
        "recent_activities": recent_activities[:10],  # Limit to 10 most recent
        "certificates_count": certificates_count if current_user.role == UserRole.STUDENT else None,
        "total_students": total_students if current_user.role == UserRole.TEACHER else None
    }


@router.get("/analytics/system")
async def get_system_analytics(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get system-wide analytics (Admin/Manager only)."""
    # Check if user is admin or manager
    # Handle both enum and string role values
    user_role = current_user.role
    if isinstance(user_role, str):
        user_role = UserRole(user_role)
    
    if user_role not in (UserRole.ADMIN, UserRole.MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can view system analytics"
        )
    
    import httpx
    from app.core.config import settings
    
    # Get Authorization header from request to forward to other services
    auth_header = request.headers.get("Authorization")
    headers = {}
    if auth_header:
        headers["Authorization"] = auth_header
    
    # Get user statistics
    total_users = db.query(User).count()
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_teachers = db.query(User).filter(User.role == UserRole.TEACHER).count()
    total_admins = db.query(User).filter(User.role == UserRole.ADMIN).count()
    total_managers = db.query(User).filter(User.role == UserRole.MANAGER).count()
    
    # Get course statistics
    total_courses = db.query(Course).count()
    # Note: Course model doesn't have is_active field, so all courses are considered active
    active_courses = total_courses
    
    # Get enrollment statistics
    total_enrollments = db.query(CourseEnrollment).count()
    student_enrollments = db.query(CourseEnrollment).filter(
        CourseEnrollment.role_in_course == CourseRole.student
    ).count()
    teacher_enrollments = db.query(CourseEnrollment).filter(
        CourseEnrollment.role_in_course == CourseRole.teacher
    ).count()
    
    # Get quiz statistics
    total_quizzes = db.query(Quiz).count()
    published_quizzes = db.query(Quiz).filter(Quiz.is_published == True).count()
    total_quiz_attempts = db.query(QuizAttempt).count()
    completed_quiz_attempts = db.query(QuizAttempt).filter(
        QuizAttempt.submitted_at != None
    ).count()
    
    # Get quiz average score
    avg_quiz_score = db.query(func.avg(QuizAttempt.percentage)).filter(
        QuizAttempt.percentage != None
    ).scalar()
    
    # Get live session statistics
    total_sessions = db.query(LiveSession).count()
    completed_sessions = db.query(LiveSession).filter(
        LiveSession.status == "completed"
    ).count()
    ongoing_sessions = db.query(LiveSession).filter(
        LiveSession.status == "ongoing"
    ).count()
    
    # Get certificate statistics
    try:
        from app.models.certificate import Certificate
        total_certificates = db.query(Certificate).count()
    except Exception as e:
        print(f"[System Analytics] Error fetching certificates: {e}")
        total_certificates = 0
    
    # Get material statistics
    try:
        from app.models.course_material import CourseMaterial
        total_materials = db.query(CourseMaterial).count()
    except Exception as e:
        print(f"[System Analytics] Error fetching materials: {e}")
        total_materials = 0
    
    # Get assignment statistics (from assignment-service)
    total_assignments = 0
    total_submissions = 0
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                assignment_url = f"{settings.ASSIGNMENT_SERVICE_URL}/assignments"
                assignment_response = await client.get(
                    assignment_url,
                    headers=headers,
                    params={"limit": 1000}
                )
                if assignment_response.status_code == 200:
                    assignment_data = assignment_response.json()
                    assignments = assignment_data.get("items", [])
                    total_assignments = len(assignments)
                    total_submissions = sum([a.get("submission_count", 0) for a in assignments])
            except Exception as e:
                print(f"[System Analytics] Error fetching assignments: {e}")
    except Exception as e:
        print(f"[System Analytics] Error connecting to assignment service: {e}")
    
    # Get recent courses (last 5)
    recent_courses_list = []
    try:
        recent_courses = db.query(Course).order_by(Course.created_at.desc()).limit(5).all()
        for course in recent_courses:
            student_count = db.query(CourseEnrollment).filter(
                CourseEnrollment.course_id == course.id,
                CourseEnrollment.role_in_course == CourseRole.student
            ).count()
            recent_courses_list.append({
                "id": str(course.id),
                "name": course.name,
                "code": course.code,
                "created_at": course.created_at.isoformat() if course.created_at else None,
                "student_count": student_count
            })
    except Exception as e:
        print(f"[System Analytics] Error fetching recent courses: {e}")
        import traceback
        traceback.print_exc()
        recent_courses_list = []
    
    # Get recent users (last 5)
    recent_users_list = []
    try:
        recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
        for user in recent_users:
            user_role = user.role
            if isinstance(user_role, UserRole):
                role_str = user_role.value
            else:
                role_str = str(user_role)
            recent_users_list.append({
                "id": str(user.id),
                "full_name": user.full_name,
                "email": user.email,
                "role": role_str,
                "created_at": user.created_at.isoformat() if user.created_at else None
            })
    except Exception as e:
        print(f"[System Analytics] Error fetching recent users: {e}")
        import traceback
        traceback.print_exc()
        recent_users_list = []
    
    # Calculate growth (users created in last 30 days)
    try:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        new_users_30d = db.query(User).filter(User.created_at >= thirty_days_ago).count()
        new_courses_30d = db.query(Course).filter(Course.created_at >= thirty_days_ago).count()
    except Exception as e:
        print(f"[System Analytics] Error calculating growth: {e}")
        new_users_30d = 0
        new_courses_30d = 0
    
    return {
        "users": {
            "total": total_users,
            "students": total_students,
            "teachers": total_teachers,
            "admins": total_admins,
            "managers": total_managers,
            "new_last_30d": new_users_30d
        },
        "courses": {
            "total": total_courses,
            "active": active_courses,
            "new_last_30d": new_courses_30d
        },
        "enrollments": {
            "total": total_enrollments,
            "students": student_enrollments,
            "teachers": teacher_enrollments
        },
        "quizzes": {
            "total": total_quizzes,
            "published": published_quizzes,
            "total_attempts": total_quiz_attempts,
            "completed_attempts": completed_quiz_attempts,
            "average_score": float(avg_quiz_score) if avg_quiz_score else None
        },
        "live_sessions": {
            "total": total_sessions,
            "completed": completed_sessions,
            "ongoing": ongoing_sessions
        },
        "certificates": {
            "total": total_certificates
        },
        "materials": {
            "total": total_materials
        },
        "assignments": {
            "total": total_assignments,
            "total_submissions": total_submissions
        },
        "recent_courses": recent_courses_list,
        "recent_users": recent_users_list
    }

