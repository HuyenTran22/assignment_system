from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole
from uuid import UUID


# CSV Import
class CSVUserRow(BaseModel):
    student_id: str
    full_name: str
    email: EmailStr
    class_name: Optional[str] = None
    role: UserRole


class CSVImportResponse(BaseModel):
    success: bool
    created: int
    failed: int
    users: list[dict]  # Contains student_id, email, password (one-time only), full_name
    errors: list[dict]  # Contains row, error


# User Management
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    student_id: Optional[str] = None
    class_name: Optional[str] = None
    role: Optional[UserRole] = None


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    student_id: Optional[str] = None
    class_name: Optional[str] = None
    must_change_password: bool
    last_password_change: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    total: int
    users: list[UserResponse]


# Password Management
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('Password must contain at least one special character')
        return v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('Password must contain at least one special character')
        return v


class PasswordResetLinkResponse(BaseModel):
    reset_link: str
    expires_at: datetime
