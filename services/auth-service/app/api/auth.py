from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user
)
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    UserResponse,
    TokenRefreshRequest,
    TokenRefreshResponse
)

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login endpoint - authenticate user and return tokens."""
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/register", response_model=AuthResponse)
async def register(
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Register a new user."""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == register_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    from app.core.security import get_password_hash
    password_hash = get_password_hash(register_data.password)
    
    # Create user
    new_user = User(
        email=register_data.email,
        full_name=register_data.full_name,
        password_hash=password_hash,
        role=register_data.role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role.value})
    refresh_token = create_refresh_token(data={"sub": str(new_user.id)})
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(new_user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information."""
    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_token(
    token_data: TokenRefreshRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token."""
    from app.core.security import decode_token
    
    # Decode refresh token
    try:
        payload = decode_token(token_data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Create new access token
        access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
        
        return TokenRefreshResponse(access_token=access_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
