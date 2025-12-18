"""
Unified Base for ALL models across all services.
This is the SINGLE source of truth for SQLAlchemy metadata.
"""
from sqlalchemy.orm import declarative_base

# Single Base for all models
Base = declarative_base()
