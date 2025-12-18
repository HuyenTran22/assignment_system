from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from pydantic import BaseModel

from app.db import get_db
from app.models.user import User
from app.models.password import PasswordResetToken
from app.core.security import get_password_hash

router = APIRouter(tags=["password"])


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset")
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset password using a reset token.
    
    - **token**: The password reset token from the email link
    - **new_password**: The new password to set
    """
    import traceback
    
    try:
        # Find the reset token
        reset_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.token == request.token
        ).first()
        
        if not reset_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired reset token"
            )
        
        # Check if token is already used
        if reset_token.used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This reset token has already been used"
            )
        
        # Check if token is expired
        # expires_at is timezone-aware, so we need to compare with timezone-aware datetime
        now = datetime.now(timezone.utc)
        # Ensure expires_at is timezone-aware (in case it's not)
        if reset_token.expires_at.tzinfo is None:
            # If naive, assume it's UTC
            expires_at = reset_token.expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at = reset_token.expires_at
        
        if expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This reset token has expired"
            )
        
        # Validate password (basic validation)
        if len(request.new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
        
        # Get the user
        user = db.query(User).filter(User.id == reset_token.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Hash the new password
        new_password_hash = get_password_hash(request.new_password)
        
        # Update user password
        user.password_hash = new_password_hash
        user.must_change_password = False
        
        # Mark token as used
        reset_token.used = True
        
        # Commit changes
        db.commit()
        
        return {"message": "Password reset successfully"}
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the full error for debugging
        print(f"[Password Reset] Error: {str(e)}")
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

