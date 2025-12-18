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
    This function only registers models and verifies connection.
    """
    from app.models import user, password, profile
    
    # Verify database connection and that migrations have been applied
    with engine.connect() as conn:
        try:
            from sqlalchemy import text
            result = conn.execute(text("SELECT 1 FROM users LIMIT 1"))
            print("[User Service] Database connection verified - tables exist")
        except Exception as e:
            print(f"[User Service] WARNING: Tables may not exist yet: {e}")
            # Don't create tables - let db-migration-service handle it
            # Service will retry connection on startup

