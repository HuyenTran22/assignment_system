from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    SERVICE_NAME: str = "notification-service"
    SERVICE_PORT: int = 8009
    DATABASE_URL: str = "postgresql://postgres:123456@localhost:5432/assignment_management"
    JWT_SECRET_KEY: str = "super-secret-key-change-in-production-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    AUTH_SERVICE_URL: str = "http://localhost:8001"
    USER_SERVICE_URL: str = "http://localhost:8002"
    COURSE_SERVICE_URL: str = "http://localhost:8003"
    ASSIGNMENT_SERVICE_URL: str = "http://localhost:8004"
    SUBMISSION_SERVICE_URL: str = "http://localhost:8005"
    GRADING_SERVICE_URL: str = "http://localhost:8006"
    PEER_REVIEW_SERVICE_URL: str = "http://localhost:8007"
    PLAGIARISM_SERVICE_URL: str = "http://localhost:8008"
    NOTIFICATION_SERVICE_URL: str = "http://localhost:8009"
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 20971520
    DEBUG: bool = True
    
    # Email Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "noreply@assignment.com"
    SMTP_PASSWORD: str = "your-app-password"
    SMTP_FROM_EMAIL: str = "noreply@assignment.com"
    SMTP_FROM_NAME: str = "Assignment Management System"
    SMTP_USE_TLS: bool = True
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
