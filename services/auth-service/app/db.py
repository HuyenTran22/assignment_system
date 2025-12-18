from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database and create admin user if not exists.
    Tables are created by db-migration-service using Alembic.
    """
    from sqlalchemy import text
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash
    
    # Verify tables exist (created by db-migration-service)
    with engine.connect() as conn:
        try:
            conn.execute(text("SELECT 1 FROM users LIMIT 1"))
            print("[Auth Service] Database tables verified")
        except Exception as e:
            print(f"[Auth Service] WARNING: Tables may not exist yet: {e}")
            return  # Exit early, tables need to be created by migration service
    
    # Create admin user if not exists
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not admin:
            admin = User(
                email=settings.ADMIN_EMAIL,
                full_name="System Administrator",
                password_hash=get_password_hash(settings.ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                must_change_password=False
            )
            db.add(admin)
            db.commit()
            print(f"Admin user created: {settings.ADMIN_EMAIL}")
        else:
            print(f"Admin user already exists: {settings.ADMIN_EMAIL}")
    finally:
        db.close()
