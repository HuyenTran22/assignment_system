"""
Database configuration for migration service.
Uses environment variables from Docker.
"""
import os

class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:password@localhost:5432/assignment_management"
    )
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

settings = Settings()
