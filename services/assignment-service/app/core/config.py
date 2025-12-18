from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    SERVICE_NAME: str = "assignment-service"
    SERVICE_PORT: int = 8004
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
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
