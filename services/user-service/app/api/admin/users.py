from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List
import os

from app.db import get_db
from app.models.user import User, UserRole
from app.schemas.admin import (
    CSVImportResponse,
    UserResponse,
    UserListResponse,
    UserUpdate,
    PasswordResetLinkResponse
)
from app.services.csv_import_service import process_csv_import, generate_csv_template
from app.services.password_service import create_reset_token
from app.services.email_service import email_service
from app.core.security import get_current_user

router = APIRouter(tags=["admin"])


from app.api.dependencies import require_admin


# All routes in this file now require ADMIN role via dependency
# No need for separate require_admin function


@router.get("/users/template")
async def download_csv_template(
    current_user: User = Depends(require_admin)
):
    """Download CSV template for bulk user import"""
    from fastapi.responses import Response
    
    template = generate_csv_template()
    
    return Response(
        content=template,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=user_import_template.csv"
        }
    )


@router.post("/users/import", response_model=CSVImportResponse)
async def import_users_from_csv(
    file: UploadFile = File(...),
    send_emails: bool = Query(False, description="Send welcome emails to created users"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Import users from CSV file"""
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Process CSV
    result = await process_csv_import(db, file, str(current_user.id))
    
    # Send welcome emails if requested
    if send_emails and result.users:
        email_errors = []
        for user_data in result.users:
            try:
                success = email_service.send_welcome_email(
                    user_data['email'],
                    user_data['full_name'],
                    user_data['password']
                )
                if not success:
                    email_errors.append(f"Failed to send email to {user_data['email']}")
            except Exception as e:
                email_errors.append(f"Failed to send email to {user_data['email']}: {str(e)}")
        
        # Log email errors but don't fail the import
        if email_errors:
            print(f"Email sending errors: {email_errors}")
    
    return result


@router.get("/users", response_model=UserListResponse)
async def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None, description="Search by name, email, or student ID"),
    role: UserRole = Query(None, description="Filter by role"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all users (admin only, NO passwords)"""
    
    query = db.query(User)
    
    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(search_filter)) |
            (User.email.ilike(search_filter)) |
            (User.student_id.ilike(search_filter))
        )
    
    if role:
        query = query.filter(User.role == role)
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    users = query.offset(skip).limit(limit).all()
    
    return UserListResponse(
        total=total,
        users=[UserResponse.model_validate(user) for user in users]
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get user details"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update user details"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}


@router.post("/users/{user_id}/reset-password", response_model=PasswordResetLinkResponse)
async def admin_reset_password(
    user_id: str,
    send_email: bool = Query(True, description="Send reset link via email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Generate password reset link for user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create reset token
    try:
        reset_token = create_reset_token(db, str(user.id))
        
        # Generate reset link
        from app.core.config import settings
        frontend_url = settings.FRONTEND_URL
        reset_link = f"{frontend_url}/reset-password?token={reset_token.token}"
        
        # Send email if requested
        if send_email:
            try:
                email_service.send_password_reset_email(user.email, user.full_name, reset_link)
            except Exception as e:
                print(f"Failed to send email: {e}")
                # Don't fail the request if email fails
        
        return PasswordResetLinkResponse(
            reset_link=reset_link,
            expires_at=reset_token.expires_at.isoformat() if reset_token.expires_at else "N/A"
        )
    except Exception as e:
        print(f"Error creating reset token: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create reset token: {str(e)}")


@router.put("/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    new_role: UserRole,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Change user role"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent changing your own role
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    user.role = new_role
    db.commit()
    
    return {"message": f"User role changed to {new_role.value}"}
