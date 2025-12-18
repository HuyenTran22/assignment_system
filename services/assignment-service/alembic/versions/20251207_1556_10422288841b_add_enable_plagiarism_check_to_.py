"""add_enable_plagiarism_check_to_assignments

Revision ID: 10422288841b
Revises: add_manager_role
Create Date: 2025-12-07 15:56:05.957296

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '10422288841b'
down_revision: Union[str, None] = 'add_manager_role'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add enable_plagiarism_check column to assignments table
    op.add_column('assignments', sa.Column('enable_plagiarism_check', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    # Remove enable_plagiarism_check column from assignments table
    op.drop_column('assignments', 'enable_plagiarism_check')
