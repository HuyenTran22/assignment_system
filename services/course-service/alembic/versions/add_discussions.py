"""Add discussion_threads and discussion_replies tables

Revision ID: add_discussions
Revises: add_course_materials
Create Date: 2025-01-28 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_discussions'
down_revision: Union[str, None] = 'add_course_materials'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create discussion_threads table
    op.create_table(
        'discussion_threads',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_locked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reply_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )
    op.create_index('ix_discussion_threads_course_id', 'discussion_threads', ['course_id'])
    op.create_index('ix_discussion_threads_user_id', 'discussion_threads', ['user_id'])
    op.create_index('ix_discussion_threads_created_at', 'discussion_threads', ['created_at'])
    
    # Create discussion_replies table
    op.create_table(
        'discussion_replies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('thread_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('parent_reply_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['thread_id'], ['discussion_threads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['parent_reply_id'], ['discussion_replies.id'], ondelete='CASCADE')
    )
    op.create_index('ix_discussion_replies_thread_id', 'discussion_replies', ['thread_id'])
    op.create_index('ix_discussion_replies_user_id', 'discussion_replies', ['user_id'])
    op.create_index('ix_discussion_replies_created_at', 'discussion_replies', ['created_at'])


def downgrade() -> None:
    op.drop_table('discussion_replies')
    op.drop_table('discussion_threads')

