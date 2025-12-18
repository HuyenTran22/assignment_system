from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from app.models.user import User, UserRole


def require_teacher_or_manager_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require TEACHER, MANAGER, or ADMIN role."""
    if current_user.role not in [UserRole.TEACHER, UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Required roles: TEACHER, MANAGER, or ADMIN"
        )
    return current_user


def require_course_owner_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require course owner or ADMIN role."""
    if current_user.role not in [UserRole.ADMIN]:
        # TODO: Add course ownership check
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden"
        )
    return current_user

