"""add video call

Revision ID: add_video_call
Revises: add_certificates
Create Date: 2025-01-12 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_video_call'
down_revision = 'add_certificates'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create video_call_rooms table
    op.create_table(
        'video_call_rooms',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('room_name', sa.String(255), nullable=False),
        sa.Column('room_url', sa.String(500)),
        sa.Column('status', sa.String(20), nullable=False, server_default='idle'),
        sa.Column('is_locked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('max_participants', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('started_at', sa.DateTime(timezone=True)),
        sa.Column('ended_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('course_id', name='uq_video_call_rooms_course_id')
    )
    op.create_index('ix_video_call_rooms_course_id', 'video_call_rooms', ['course_id'])
    
    # Create video_call_participants table
    op.create_table(
        'video_call_participants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('room_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('left_at', sa.DateTime(timezone=True)),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['room_id'], ['video_call_rooms.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('ix_video_call_participants_room_id', 'video_call_participants', ['room_id'])
    op.create_index('ix_video_call_participants_user_id', 'video_call_participants', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_video_call_participants_user_id', table_name='video_call_participants')
    op.drop_index('ix_video_call_participants_room_id', table_name='video_call_participants')
    op.drop_table('video_call_participants')
    op.drop_index('ix_video_call_rooms_course_id', table_name='video_call_rooms')
    op.drop_table('video_call_rooms')

