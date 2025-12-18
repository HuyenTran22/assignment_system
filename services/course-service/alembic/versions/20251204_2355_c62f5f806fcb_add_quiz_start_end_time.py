"""add_quiz_start_end_time

Revision ID: c62f5f806fcb
Revises: add_video_call
Create Date: 2025-12-04 23:55:04.162435

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c62f5f806fcb'
down_revision: Union[str, None] = 'add_video_call'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add start_time and end_time to quizzes table (keep time_limit_minutes for backward compatibility)
    op.add_column('quizzes', sa.Column('start_time', sa.DateTime(timezone=True), nullable=True))
    op.add_column('quizzes', sa.Column('end_time', sa.DateTime(timezone=True), nullable=True))
    # Note: time_limit_minutes is kept for backward compatibility, not dropped


def downgrade() -> None:
    # Remove start_time and end_time (keep time_limit_minutes)
    op.drop_column('quizzes', 'end_time')
    op.drop_column('quizzes', 'start_time')
