from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from app.models.user import User, UserRole


def require_teacher_or_manager_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require TEACHER, MANAGER, or ADMIN role."""
    # Debug logging
    print(f"[Dependencies] Checking role for user {current_user.email}: {current_user.role} (type: {type(current_user.role)})")
    print(f"[Dependencies] Allowed roles: {[UserRole.TEACHER, UserRole.MANAGER, UserRole.ADMIN]}")
    print(f"[Dependencies] Role comparison: {current_user.role in [UserRole.TEACHER, UserRole.MANAGER, UserRole.ADMIN]}")
    
    # Handle both enum and string comparison
    user_role = current_user.role
    if isinstance(user_role, str):
        user_role = UserRole(user_role)
    
    if user_role not in [UserRole.TEACHER, UserRole.MANAGER, UserRole.ADMIN]:
        print(f"[Dependencies] Access denied for user {current_user.email} with role {user_role}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Required roles: TEACHER, MANAGER, or ADMIN"
        )
    
    print(f"[Dependencies] Access granted for user {current_user.email} with role {user_role}")
    return current_user


def require_course_owner_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require course owner or ADMIN role."""
    # Debug logging
    print(f"[Dependencies] require_course_owner_or_admin - User: {current_user.email}, Role: {current_user.role}")
    
    # Handle both enum and string comparison
    user_role = current_user.role
    if isinstance(user_role, str):
        user_role = UserRole(user_role)
    
    if user_role != UserRole.ADMIN:
        # TODO: Add course ownership check
        print(f"[Dependencies] Access denied - not ADMIN")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Required role: ADMIN"
        )
    
    print(f"[Dependencies] Access granted - ADMIN")
    return current_user

