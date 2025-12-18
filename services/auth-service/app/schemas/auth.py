from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Optional[UserRole] = UserRole.STUDENT


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    student_id: Optional[str] = None
    class_name: Optional[str] = None
    created_at: datetime
    
    @classmethod
    def model_validate(cls, obj):
        """Override to convert UUID to string."""
        if hasattr(obj, 'id') and hasattr(obj.id, '__str__'):
            # Convert UUID to string
            data = {
                'id': str(obj.id),
                'email': obj.email,
                'full_name': obj.full_name,
                'role': obj.role,
                'student_id': obj.student_id,
                'class_name': obj.class_name,
                'created_at': obj.created_at
            }
            return cls(**data)
        return super().model_validate(obj)
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

