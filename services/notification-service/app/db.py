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
    """Verify database connection. Tables are created by db-migration-service."""
    from app.models import user, notification, course
    
    with engine.connect() as conn:
        try:
            result = conn.execute(text("SELECT 1 FROM notifications LIMIT 1"))
            print("[Notification Service] Database connection verified")
        except Exception as e:
            print(f"[Notification Service] WARNING: Tables may not exist yet: {e}")
