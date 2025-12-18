from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import Optional
from uuid import UUID
import math

from app.db import get_db
from app.core.security import get_current_user
from app.api.dependencies import require_teacher_or_manager_or_admin, require_course_owner_or_admin
from app.models.user import User, UserRole
from app.models.course import Course, CourseEnrollment, CourseRole
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    EnrollmentCreate,
    EnrollmentResponse,
    UserInfo,
    PaginatedResponse
)

router = APIRouter()


@router.get("", response_model=PaginatedResponse)
def list_courses(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List courses based on user role.
    
    - **Students**: Only enrolled courses
    - **Teachers/Admins**: All courses
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 20, max: 100)
    - **search**: Search by name or code
    """
    query = db.query(Course)
    
    # Filter by role - STRICT ACCESS CONTROL
    # Log for debugging
    print(f"[Course Service] list_courses - User: {current_user.email}, Role: {current_user.role}")
    
    # Convert role to enum if needed
    user_role = current_user.role
    if isinstance(user_role, str):
        user_role = UserRole(user_role)
    
    if user_role == UserRole.STUDENT:
        # Students only see enrolled courses
        query = query.join(CourseEnrollment).filter(
            CourseEnrollment.user_id == current_user.id
        )
    elif user_role == UserRole.TEACHER:
        # Teachers only see courses they teach
        query = query.join(CourseEnrollment).filter(
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.role_in_course == CourseRole.teacher
        )
    # MANAGER and ADMIN see all courses (no filter)
    
    # Search filter
    if search:
        query = query.filter(
            or_(
                Course.name.ilike(f"%{search}%"),
                Course.code.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    total = query.count()
    
    # Pagination
    offset = (page - 1) * limit
    courses = query.offset(offset).limit(limit).all()
    
    # Add enrollment and assignment counts
    course_responses = []
    for course in courses:
        enrollment_count = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course.id
        ).count()
        
        # Assignment count: In microservices architecture, assignments are in assignment-service
        # For now, set to 0. In future, can call assignment-service API to get count
        assignment_count = 0  # TODO: Call assignment-service API to get actual count
        
        course_dict = CourseResponse.model_validate(course).model_dump()
        course_dict['enrollment_count'] = enrollment_count
        course_dict['assignment_count'] = assignment_count
        course_responses.append(CourseResponse(**course_dict))
    
    return PaginatedResponse(
        items=course_responses,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 0
    )


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    course_data: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Create a new course.
    
    Requires TEACHER, MANAGER, or ADMIN role.
    
    - **name**: Course name
    - **code**: Unique course code
    - **description**: Course description (optional)
    """
    # Check if code already exists
    existing_course = db.query(Course).filter(Course.code == course_data.code).first()
    if existing_course:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Course code '{course_data.code}' already exists"
        )
    
    # Create course
    course = Course(
        name=course_data.name,
        code=course_data.code,
        description=course_data.description,
        created_by=current_user.id
    )
    
    db.add(course)
    db.commit()
    db.refresh(course)
    
    # Auto-enroll creator as teacher (only if not ADMIN)
    # ADMIN users don't need to be enrolled - they have access to all courses
    # Only TEACHER and MANAGER need to be enrolled to manage the course
    user_role = current_user.role
    if isinstance(user_role, str):
        user_role = UserRole(user_role)
    
    if user_role != UserRole.ADMIN:
        # Check if already enrolled
        existing_enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course.id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        
        if not existing_enrollment:
            enrollment = CourseEnrollment(
                user_id=current_user.id,
                course_id=course.id,
                role_in_course=CourseRole.teacher
            )
            db.add(enrollment)
            db.commit()
    
    return course


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get course details.
    
    - Students: Only enrolled courses
    - Teachers/Admins: All courses
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check access - convert role to enum if needed
    user_role = current_user.role
    if isinstance(user_role, str):
        user_role = UserRole(user_role)
    
    if user_role == UserRole.STUDENT:
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this course"
            )
    
    # Add counts
    enrollment_count = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course.id
    ).count()
    
    course_dict = CourseResponse.model_validate(course).model_dump()
    course_dict['enrollment_count'] = enrollment_count
    # Assignment count: In microservices architecture, assignments are in assignment-service
    # For now, set to 0. In future, can call assignment-service API to get count
    course_dict['assignment_count'] = 0  # TODO: Call assignment-service API to get actual count
    
    return CourseResponse(**course_dict)


@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: UUID,
    course_data: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_course_owner_or_admin)
):
    """
    Update course details.
    
    Requires course ownership or ADMIN role.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Update fields
    update_data = course_data.model_dump(exclude_unset=True)
    
    # Check code uniqueness if updating code
    if 'code' in update_data and update_data['code'] != course.code:
        existing = db.query(Course).filter(Course.code == update_data['code']).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Course code '{update_data['code']}' already exists"
            )
    
    for field, value in update_data.items():
        setattr(course, field, value)
    
    db.commit()
    db.refresh(course)
    
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_course_owner_or_admin)
):
    """
    Delete a course.
    
    Requires course ownership or ADMIN role.
    Cascades to enrollments, assignments, submissions, etc.
    """
    import traceback
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        db.delete(course)
        db.commit()
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        print(f"[Delete Course] Error deleting course {course_id}: {error_msg}")
        traceback.print_exc()
        
        # Check for foreign key constraint errors
        if "foreign key" in error_msg.lower() or "constraint" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete course: Course has related data in other services (assignments, submissions, grades). Please delete related data first."
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete course: {error_msg}"
        )


@router.post("/{course_id}/enroll", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def enroll_student(
    course_id: UUID,
    enrollment_data: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Enroll a user in a course.
    
    Requires TEACHER (course teacher), MANAGER, or ADMIN role.
    
    - **user_id**: User to enroll
    - **role_in_course**: student or teacher
    """
    # Check course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check permission (course teacher, manager, or admin)
    if current_user.role not in (UserRole.ADMIN, UserRole.MANAGER):
        teacher_enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.role_in_course == CourseRole.teacher
        ).first()
        if not teacher_enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to enroll users in this course"
            )
    
    # Check user exists
    user = db.query(User).filter(User.id == enrollment_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already enrolled
    existing = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.user_id == enrollment_data.user_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already enrolled in this course"
        )
    
    # Map role from frontend format (STUDENT/TEACHER) to CourseRole enum (student/teacher)
    role_mapping = {
        'STUDENT': CourseRole.student,
        'TEACHER': CourseRole.teacher,
        'student': CourseRole.student,
        'teacher': CourseRole.teacher
    }
    role_in_course = role_mapping.get(enrollment_data.role.upper(), CourseRole.student)
    
    # Create enrollment
    enrollment = CourseEnrollment(
        user_id=enrollment_data.user_id,
        course_id=course_id,
        role_in_course=role_in_course
    )
    
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    
    # Eager load user relationship
    enrollment = db.query(CourseEnrollment).options(
        joinedload(CourseEnrollment.user)
    ).filter(CourseEnrollment.id == enrollment.id).first()
    
    # Build response with user info
    enrollment_dict = {
        'id': enrollment.id,
        'user_id': enrollment.user_id,
        'course_id': enrollment.course_id,
        'role_in_course': enrollment.role_in_course,
        'enrolled_at': enrollment.enrolled_at,
        'user': UserInfo(
            id=enrollment.user.id,
            full_name=enrollment.user.full_name,
            email=enrollment.user.email,
            student_id=enrollment.user.student_id
        ) if enrollment.user else None
    }
    
    return EnrollmentResponse(**enrollment_dict)


@router.get("/{course_id}/enrollments", response_model=list[EnrollmentResponse])
def list_enrollments(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all enrollments in a course.
    
    - Teachers/Admins: See all enrollments
    - Students: Only if enrolled
    """
    # Check course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check access - convert role to enum if needed
    user_role = current_user.role
    if isinstance(user_role, str):
        user_role = UserRole(user_role)
    
    if user_role == UserRole.STUDENT:
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this course"
            )
    
    # Eager load user relationship
    enrollments = db.query(CourseEnrollment).options(
        joinedload(CourseEnrollment.user)
    ).filter(
        CourseEnrollment.course_id == course_id
    ).all()
    
    # Build response with user info
    enrollment_responses = []
    for enrollment in enrollments:
        enrollment_dict = {
            'id': enrollment.id,
            'user_id': enrollment.user_id,
            'course_id': enrollment.course_id,
            'role_in_course': enrollment.role_in_course,
            'enrolled_at': enrollment.enrolled_at,
            'user': UserInfo(
                id=enrollment.user.id,
                full_name=enrollment.user.full_name,
                email=enrollment.user.email,
                student_id=enrollment.user.student_id
            ) if enrollment.user else None
        }
        enrollment_responses.append(EnrollmentResponse(**enrollment_dict))
    
    return enrollment_responses


@router.delete("/{course_id}/enrollments/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enrollment(
    course_id: UUID,
    enrollment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Remove a user from a course (unenroll).
    
    Requires TEACHER (course teacher), MANAGER, or ADMIN role.
    """
    import traceback
    try:
        # Check course exists
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Check enrollment exists
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.id == enrollment_id,
            CourseEnrollment.course_id == course_id
        ).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Enrollment not found"
            )
        
        # Check permission (course teacher, manager, or admin)
        user_role = current_user.role
        if isinstance(user_role, str):
            user_role = UserRole(user_role)
        
        if user_role not in (UserRole.ADMIN, UserRole.MANAGER):
            # Check if current user is a teacher of this course
            teacher_enrollment = db.query(CourseEnrollment).filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.user_id == current_user.id,
                CourseEnrollment.role_in_course == CourseRole.teacher
            ).first()
            if not teacher_enrollment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to remove users from this course"
                )
        
        db.delete(enrollment)
        db.commit()
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[Delete Enrollment] Error removing enrollment {enrollment_id} from course {course_id}: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove enrollment: {str(e)}"
        )
