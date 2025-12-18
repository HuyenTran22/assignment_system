from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Ignore extra fields - all fields are already defined below
    )
    
    SERVICE_NAME: str = "user-service"
    SERVICE_PORT: int = 8002
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
    
    # SMTP Email Configuration (optional)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@system.com"
    FRONTEND_URL: str = "http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

settings = Settings()
