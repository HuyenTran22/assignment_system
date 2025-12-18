"""Add course_materials and course_modules tables

Revision ID: add_course_materials
Revises: add_manager_role
Create Date: 2025-01-28 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_course_materials'
down_revision: Union[str, None] = 'add_manager_role'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create MaterialType enum (if not exists)
    op.execute("DO $$ BEGIN CREATE TYPE materialtype AS ENUM ('lesson', 'video', 'document'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    
    # Check if table exists before creating
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Create course_modules table
    if 'course_modules' not in existing_tables:
        op.create_table(
            'course_modules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE')
    )
        op.create_index('ix_course_modules_course_id', 'course_modules', ['course_id'])
    
    # Create course_materials table
    if 'course_materials' not in existing_tables:
        op.create_table(
            'course_materials',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('module_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('type', postgresql.ENUM('lesson', 'video', 'document', name='materialtype', create_type=False), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('video_url', sa.String(500), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['module_id'], ['course_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'])
    )
        op.create_index('ix_course_materials_course_id', 'course_materials', ['course_id'])
        op.create_index('ix_course_materials_module_id', 'course_materials', ['module_id'])
    
    # Create user_course_progress table
    if 'user_course_progress' not in existing_tables:
        op.create_table(
            'user_course_progress',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('module_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('material_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('progress_percentage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['module_id'], ['course_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['material_id'], ['course_materials.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('user_id', 'material_id', name='uq_user_material_progress')
        )
        op.create_index('ix_user_course_progress_user_id', 'user_course_progress', ['user_id'])
        op.create_index('ix_user_course_progress_course_id', 'user_course_progress', ['course_id'])
        op.create_index('ix_user_course_progress_material_id', 'user_course_progress', ['material_id'])


def downgrade() -> None:
    op.drop_table('user_course_progress')
    op.drop_table('course_materials')
    op.drop_table('course_modules')
    op.execute('DROP TYPE IF EXISTS materialtype')

