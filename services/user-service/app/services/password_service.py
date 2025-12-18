import secrets
import string
from typing import Optional, Union
from sqlalchemy.orm import Session
from app.models.user import User
from datetime import datetime, timedelta, timezone


def generate_random_password(length: int = 12) -> str:
    """
    Generate a random password.
    
    Args:
        length: Length of the password (default: 12)
    
    Returns:
        A random password string
    """
    # Use a mix of uppercase, lowercase, digits, and special characters
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


def create_reset_token(db: Session, user: Union[User, str]) -> "PasswordResetToken":
    """
    Create a password reset token for a user.
    
    Args:
        db: Database session
        user: User object or user ID string
    
    Returns:
        PasswordResetToken object
    """
    from app.models.password import PasswordResetToken
    
    # Get user if user_id string provided
    if isinstance(user, str):
        user = db.query(User).filter(User.id == user).first()
        if not user:
            raise ValueError(f"User with id {user} not found")
    
    # Generate a secure random token
    token = secrets.token_urlsafe(32)
    
    # Set expiration (1 hour from now) - use timezone-aware datetime
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Create reset token record
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    
    db.add(reset_token)
    db.commit()
    db.refresh(reset_token)
    
    return reset_token

