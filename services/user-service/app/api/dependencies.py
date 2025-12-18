from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from app.models.user import User, UserRole


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require ADMIN role."""
    # Debug logging
    print(f"[User Service Dependencies] Checking admin role for user {current_user.email}")
    print(f"[User Service Dependencies] User role: {current_user.role} (type: {type(current_user.role)})")
    
    # Handle both enum and string comparison
    user_role = current_user.role
    if isinstance(user_role, str):
        try:
            user_role = UserRole(user_role)
        except ValueError:
            print(f"[User Service Dependencies] Invalid role string: {user_role}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden. Required role: ADMIN"
            )
    
    if user_role != UserRole.ADMIN:
        print(f"[User Service Dependencies] Access denied - user role {user_role} is not ADMIN")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Required role: ADMIN"
        )
    
    print(f"[User Service Dependencies] Access granted - user is ADMIN")
    return current_user

