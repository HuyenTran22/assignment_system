from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, echo=settings.DEBUG)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database connection and verify tables exist.
    Tables are created by db-migration-service using Alembic.
    """
    from app.models import user, course, course_material, quiz, live_class, certificate, discussion, video_call
    
    # Verify tables exist (created by db-migration-service)
    with engine.connect() as conn:
        try:
            result = conn.execute(text("SELECT 1 FROM courses LIMIT 1"))
            print("[Course Service] Database connection verified - tables exist")
        except Exception as e:
            print(f"[Course Service] WARNING: Tables may not exist yet: {e}")
