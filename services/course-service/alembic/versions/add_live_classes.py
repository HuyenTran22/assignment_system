"""add live classes

Revision ID: add_live_classes
Revises: add_discussions
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_live_classes'
down_revision = 'add_discussions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create live_sessions table
    op.create_table(
        'live_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('meeting_url', sa.String(500), nullable=True),
        sa.Column('meeting_id', sa.String(255), nullable=True),
        sa.Column('meeting_password', sa.String(100), nullable=True),
        sa.Column('scheduled_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('scheduled_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('actual_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='scheduled'),
        sa.Column('is_recorded', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('max_participants', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('extra_data', postgresql.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    )
    op.create_index('ix_live_sessions_course_id', 'live_sessions', ['course_id'])
    op.create_index('ix_live_sessions_scheduled_start', 'live_sessions', ['scheduled_start'])

    # Create session_attendance table
    op.create_table(
        'session_attendance',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['live_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index('ix_session_attendance_session_id', 'session_attendance', ['session_id'])
    op.create_index('ix_session_attendance_user_id', 'session_attendance', ['user_id'])

    # Create session_recordings table
    op.create_table(
        'session_recordings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recording_url', sa.String(500), nullable=False),
        sa.Column('recording_type', sa.String(50), nullable=False, server_default='video'),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['session_id'], ['live_sessions.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_session_recordings_session_id', 'session_recordings', ['session_id'])


def downgrade() -> None:
    op.drop_index('ix_session_recordings_session_id', table_name='session_recordings')
    op.drop_table('session_recordings')
    op.drop_index('ix_session_attendance_user_id', table_name='session_attendance')
    op.drop_index('ix_session_attendance_session_id', table_name='session_attendance')
    op.drop_table('session_attendance')
    op.drop_index('ix_live_sessions_scheduled_start', table_name='live_sessions')
    op.drop_index('ix_live_sessions_course_id', table_name='live_sessions')
    op.drop_table('live_sessions')

