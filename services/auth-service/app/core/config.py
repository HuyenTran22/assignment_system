from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    SERVICE_NAME: str = "auth-service"
    SERVICE_PORT: int = 8001
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:123456@localhost:5432/assignment_management"
    
    # JWT (shared across services)
    JWT_SECRET_KEY: str = "super-secret-key-change-in-production-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # Frontend URL for password reset links
    FRONTEND_URL: str = "http://localhost:3000"
    
    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@example.com"
    
    DEBUG: bool = True
    
    # Admin user configuration
    ADMIN_EMAIL: str = "admin@system.com"
    ADMIN_PASSWORD: str = "Admin@123456"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

