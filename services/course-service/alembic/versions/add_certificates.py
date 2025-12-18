"""add certificates

Revision ID: add_certificates
Revises: add_live_classes
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_certificates'
down_revision = 'add_quizzes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create certificate_templates table
    op.create_table(
        'certificate_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('design_config', sa.Text(), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    )
    op.create_index('ix_certificate_templates_course_id', 'certificate_templates', ['course_id'])

    # Create certificates table
    op.create_table(
        'certificates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('certificate_number', sa.String(100), nullable=False, unique=True),
        sa.Column('verification_code', sa.String(50), nullable=False, unique=True),
        sa.Column('issued_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('issued_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_name', sa.String(255), nullable=False),
        sa.Column('course_name', sa.String(255), nullable=False),
        sa.Column('completion_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('grade', sa.String(50), nullable=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('pdf_url', sa.String(500), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['issued_by'], ['users.id']),
        sa.ForeignKeyConstraint(['template_id'], ['certificate_templates.id']),
    )
    op.create_index('ix_certificates_course_id', 'certificates', ['course_id'])
    op.create_index('ix_certificates_user_id', 'certificates', ['user_id'])
    op.create_index('ix_certificates_certificate_number', 'certificates', ['certificate_number'], unique=True)
    op.create_index('ix_certificates_verification_code', 'certificates', ['verification_code'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_certificates_verification_code', table_name='certificates')
    op.drop_index('ix_certificates_certificate_number', table_name='certificates')
    op.drop_index('ix_certificates_user_id', table_name='certificates')
    op.drop_index('ix_certificates_course_id', table_name='certificates')
    op.drop_table('certificates')
    op.drop_index('ix_certificate_templates_course_id', table_name='certificate_templates')
    op.drop_table('certificate_templates')

