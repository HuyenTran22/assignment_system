"""Add MANAGER role to UserRole enum

Revision ID: add_manager_role
Revises: 435cfcf3ee95
Create Date: 2025-11-28 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_manager_role'
down_revision: Union[str, None] = 'add_admin_features'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add MANAGER to UserRole enum
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'MANAGER'")


def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing enum values easily
    # This would require recreating the enum type
    # For now, we'll leave it as a no-op
    pass

