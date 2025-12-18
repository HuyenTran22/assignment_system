"""Initial migration with all models

Revision ID: 435cfcf3ee95
Revises: 
Create Date: 2025-11-26 00:33:38.284467

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '435cfcf3ee95'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Check if userrole enum already exists using raw SQL
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole')"
    ))
    userrole_exists = result.scalar()
    
    if 'users' not in existing_tables:
        # Create userrole enum only if it doesn't exist
        if not userrole_exists:
            conn.execute(sa.text(
                "CREATE TYPE userrole AS ENUM ('STUDENT', 'TEACHER', 'ADMIN')"
            ))
        
        op.create_table('users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('STUDENT', 'TEACHER', 'ADMIN', name='userrole', create_type=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
        op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)
    
    if 'courses' not in existing_tables:
        op.create_table('courses',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_courses_code'), 'courses', ['code'], unique=True)
    
    # Check and create notifications
    if 'notifications' not in existing_tables:
        # Check for notificationtype enum
        result = conn.execute(sa.text(
            "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificationtype')"
        ))
        if not result.scalar():
            conn.execute(sa.text(
                "CREATE TYPE notificationtype AS ENUM ('GRADE', 'SUBMISSION', 'PEER_REVIEW', 'ASSIGNMENT_CREATED', 'DEADLINE_REMINDER')"
            ))
        
        op.create_table('notifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.Enum('GRADE', 'SUBMISSION', 'PEER_REVIEW', 'ASSIGNMENT_CREATED', 'DEADLINE_REMINDER', name='notificationtype', create_type=False), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_notifications_created_at'), 'notifications', ['created_at'], unique=False)
        op.create_index(op.f('ix_notifications_is_read'), 'notifications', ['is_read'], unique=False)
        op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    
    if 'assignments' not in existing_tables:
        op.create_table('assignments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('course_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('due_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('allow_late_submission', sa.Boolean(), nullable=True),
        sa.Column('allow_peer_review', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_assignments_course_id'), 'assignments', ['course_id'], unique=False)
        op.create_index(op.f('ix_assignments_due_at'), 'assignments', ['due_at'], unique=False)
    
    if 'course_enrollments' not in existing_tables:
        result = conn.execute(sa.text(
            "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'courserole')"
        ))
        if not result.scalar():
            conn.execute(sa.text("CREATE TYPE courserole AS ENUM ('student', 'teacher')"))
        
        op.create_table('course_enrollments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('course_id', sa.UUID(), nullable=False),
        sa.Column('role_in_course', sa.Enum('student', 'teacher', name='courserole', create_type=False), nullable=False),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_course_enrollments_course_id'), 'course_enrollments', ['course_id'], unique=False)
        op.create_index(op.f('ix_course_enrollments_user_id'), 'course_enrollments', ['user_id'], unique=False)
    
    if 'assignment_files' not in existing_tables:
        op.create_table('assignment_files',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('assignment_id', sa.UUID(), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('original_name', sa.String(length=255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_assignment_files_assignment_id'), 'assignment_files', ['assignment_id'], unique=False)
    
    if 'rubrics' not in existing_tables:
        op.create_table('rubrics',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('assignment_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_rubrics_assignment_id'), 'rubrics', ['assignment_id'], unique=True)
    
    if 'submissions' not in existing_tables:
        result = conn.execute(sa.text(
            "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submissionstatus')"
        ))
        if not result.scalar():
            conn.execute(sa.text("CREATE TYPE submissionstatus AS ENUM ('SUBMITTED', 'LATE', 'RESUBMITTED')"))
        
        op.create_table('submissions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('assignment_id', sa.UUID(), nullable=False),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('status', sa.Enum('SUBMITTED', 'LATE', 'RESUBMITTED', name='submissionstatus', create_type=False), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('plagiarism_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_submissions_assignment_id'), 'submissions', ['assignment_id'], unique=False)
        op.create_index(op.f('ix_submissions_status'), 'submissions', ['status'], unique=False)
        op.create_index(op.f('ix_submissions_student_id'), 'submissions', ['student_id'], unique=False)
    
    if 'grades' not in existing_tables:
        op.create_table('grades',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('submission_id', sa.UUID(), nullable=False),
        sa.Column('grader_id', sa.UUID(), nullable=False),
        sa.Column('score', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('feedback_text', sa.Text(), nullable=True),
        sa.Column('graded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['grader_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_grades_grader_id'), 'grades', ['grader_id'], unique=False)
        op.create_index(op.f('ix_grades_submission_id'), 'grades', ['submission_id'], unique=True)
    
    if 'peer_reviews' not in existing_tables:
        op.create_table('peer_reviews',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('submission_id', sa.UUID(), nullable=False),
        sa.Column('reviewer_id', sa.UUID(), nullable=False),
        sa.Column('score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_peer_reviews_reviewer_id'), 'peer_reviews', ['reviewer_id'], unique=False)
        op.create_index(op.f('ix_peer_reviews_submission_id'), 'peer_reviews', ['submission_id'], unique=False)
    
    if 'plagiarism_matches' not in existing_tables:
        op.create_table('plagiarism_matches',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('assignment_id', sa.UUID(), nullable=False),
        sa.Column('submission1_id', sa.UUID(), nullable=False),
        sa.Column('submission2_id', sa.UUID(), nullable=False),
        sa.Column('similarity_score', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('checked_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.CheckConstraint('submission1_id < submission2_id', name='check_submission_order'),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['submission1_id'], ['submissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['submission2_id'], ['submissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_plagiarism_matches_assignment_id'), 'plagiarism_matches', ['assignment_id'], unique=False)
        op.create_index(op.f('ix_plagiarism_matches_similarity_score'), 'plagiarism_matches', ['similarity_score'], unique=False)
    
    if 'rubric_items' not in existing_tables:
        op.create_table('rubric_items',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('rubric_id', sa.UUID(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('max_score', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('weight', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['rubric_id'], ['rubrics.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_rubric_items_rubric_id'), 'rubric_items', ['rubric_id'], unique=False)
    
    if 'submission_files' not in existing_tables:
        op.create_table('submission_files',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('submission_id', sa.UUID(), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('original_name', sa.String(length=255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_submission_files_submission_id'), 'submission_files', ['submission_id'], unique=False)
    
    if 'rubric_scores' not in existing_tables:
        op.create_table('rubric_scores',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('rubric_item_id', sa.UUID(), nullable=False),
        sa.Column('submission_id', sa.UUID(), nullable=False),
        sa.Column('score', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('scored_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['rubric_item_id'], ['rubric_items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_rubric_scores_rubric_item_id'), 'rubric_scores', ['rubric_item_id'], unique=False)
        op.create_index(op.f('ix_rubric_scores_submission_id'), 'rubric_scores', ['submission_id'], unique=False)


def downgrade() -> None:
    op.drop_table('rubric_scores')
    op.drop_table('submission_files')
    op.drop_table('rubric_items')
    op.drop_table('plagiarism_matches')
    op.drop_table('peer_reviews')
    op.drop_table('grades')
    op.drop_table('submissions')
    op.drop_table('rubrics')
    op.drop_table('assignment_files')
    op.drop_table('course_enrollments')
    op.drop_table('assignments')
    op.drop_table('notifications')
    op.drop_table('courses')
    op.drop_table('users')
