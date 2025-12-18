"""Initial schema migration

Creates all tables for the Assignment Management System:
- Users, Profiles, Password management
- Courses, Enrollments, Modules, Materials
- Assignments, Submissions, Grades
- Quizzes, Live Sessions, Video Calls
- Discussions, Notifications, Peer Reviews

Revision ID: 001_initial_schema
Revises: 
Create Date: 2024-12-19

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ENUMs first (using DO block because CREATE TYPE IF NOT EXISTS doesn't exist in PostgreSQL)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE userrole AS ENUM ('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE courserole AS ENUM ('student', 'teacher');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE submissionstatus AS ENUM ('SUBMITTED', 'LATE', 'RESUBMITTED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE notificationtype AS ENUM ('GRADE', 'SUBMISSION', 'PEER_REVIEW', 'ASSIGNMENT_CREATED', 'QUIZ_CREATED', 'DISCUSSION_REPLY', 'DEADLINE_REMINDER');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', postgresql.ENUM('STUDENT', 'TEACHER', 'MANAGER', 'ADMIN', name='userrole', create_type=False), nullable=False),
        sa.Column('student_id', sa.String(50), nullable=True),
        sa.Column('class_name', sa.String(100), nullable=True),
        sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('last_password_change', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('student_id'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'])
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_role', 'users', ['role'])

    # Create user_profiles
    op.create_table('user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('social_links', postgresql.JSONB(), nullable=True),
        sa.Column('preferences', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index('ix_user_profiles_user_id', 'user_profiles', ['user_id'])

    # Create password_reset_tokens
    op.create_table('password_reset_tokens',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token', sa.String(255), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('token')
    )
    op.create_index('ix_password_reset_tokens_user_id', 'password_reset_tokens', ['user_id'])
    op.create_index('ix_password_reset_tokens_token', 'password_reset_tokens', ['token'])

    # Create password_history
    op.create_table('password_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('ix_password_history_user_id', 'password_history', ['user_id'])

    # Create courses
    op.create_table('courses',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'])
    )
    op.create_index('ix_courses_code', 'courses', ['code'])

    # Create course_enrollments
    op.create_table('course_enrollments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role_in_course', postgresql.ENUM('student', 'teacher', name='courserole', create_type=False), nullable=False),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE')
    )
    op.create_index('ix_course_enrollments_user_id', 'course_enrollments', ['user_id'])
    op.create_index('ix_course_enrollments_course_id', 'course_enrollments', ['course_id'])

    # Create course_modules
    op.create_table('course_modules',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE')
    )
    op.create_index('ix_course_modules_course_id', 'course_modules', ['course_id'])

    # Create course_materials
    op.create_table('course_materials',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('module_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('video_url', sa.String(500), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['module_id'], ['course_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'])
    )
    op.create_index('ix_course_materials_course_id', 'course_materials', ['course_id'])
    op.create_index('ix_course_materials_module_id', 'course_materials', ['module_id'])

    # Create user_course_progress
    op.create_table('user_course_progress',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('module_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('material_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('progress_percentage', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['module_id'], ['course_modules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['material_id'], ['course_materials.id'], ondelete='CASCADE')
    )
    op.create_index('ix_user_course_progress_user_id', 'user_course_progress', ['user_id'])
    op.create_index('ix_user_course_progress_course_id', 'user_course_progress', ['course_id'])

    # Create assignments
    op.create_table('assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('due_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('allow_late_submission', sa.Boolean(), server_default='false'),
        sa.Column('allow_peer_review', sa.Boolean(), server_default='false'),
        sa.Column('enable_plagiarism_check', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'])
    )
    op.create_index('ix_assignments_course_id', 'assignments', ['course_id'])
    op.create_index('ix_assignments_due_at', 'assignments', ['due_at'])

    # Create assignment_files
    op.create_table('assignment_files',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assignment_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('original_name', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE')
    )
    op.create_index('ix_assignment_files_assignment_id', 'assignment_files', ['assignment_id'])

    # Create submissions
    op.create_table('submissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assignment_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('status', postgresql.ENUM('SUBMITTED', 'LATE', 'RESUBMITTED', name='submissionstatus', create_type=False), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('plagiarism_score', sa.Numeric(5, 2), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'])
    )
    op.create_index('ix_submissions_assignment_id', 'submissions', ['assignment_id'])
    op.create_index('ix_submissions_student_id', 'submissions', ['student_id'])
    op.create_index('ix_submissions_status', 'submissions', ['status'])

    # Create submission_files
    op.create_table('submission_files',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('submission_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('original_name', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ondelete='CASCADE')
    )
    op.create_index('ix_submission_files_submission_id', 'submission_files', ['submission_id'])

    # Create grades
    op.create_table('grades',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('submission_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('grader_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('score', sa.Numeric(5, 2), nullable=False),
        sa.Column('feedback_text', sa.Text(), nullable=True),
        sa.Column('graded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('submission_id'),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['grader_id'], ['users.id'])
    )
    op.create_index('ix_grades_submission_id', 'grades', ['submission_id'])
    op.create_index('ix_grades_grader_id', 'grades', ['grader_id'])

    # Create peer_reviews
    op.create_table('peer_reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('submission_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reviewer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('score', sa.Numeric(5, 2), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'])
    )
    op.create_index('ix_peer_reviews_submission_id', 'peer_reviews', ['submission_id'])
    op.create_index('ix_peer_reviews_reviewer_id', 'peer_reviews', ['reviewer_id'])

    # Create quizzes
    op.create_table('quizzes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('max_attempts', sa.Integer(), server_default='1'),
        sa.Column('passing_score', sa.Float(), server_default='60.0'),
        sa.Column('is_published', sa.Boolean(), server_default='false'),
        sa.Column('shuffle_questions', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'])
    )
    op.create_index('ix_quizzes_course_id', 'quizzes', ['course_id'])

    # Create quiz_questions
    op.create_table('quiz_questions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quiz_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('question_type', sa.String(50), nullable=False),
        sa.Column('options', postgresql.JSON(), nullable=True),
        sa.Column('correct_answer', sa.Text(), nullable=False),
        sa.Column('points', sa.Float(), server_default='1.0'),
        sa.Column('order_index', sa.Integer(), server_default='0'),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ondelete='CASCADE')
    )
    op.create_index('ix_quiz_questions_quiz_id', 'quiz_questions', ['quiz_id'])

    # Create quiz_attempts
    op.create_table('quiz_attempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quiz_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('percentage', sa.Float(), nullable=True),
        sa.Column('is_passed', sa.Boolean(), nullable=True),
        sa.Column('time_taken_seconds', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )
    op.create_index('ix_quiz_attempts_quiz_id', 'quiz_attempts', ['quiz_id'])
    op.create_index('ix_quiz_attempts_user_id', 'quiz_attempts', ['user_id'])

    # Create quiz_answers
    op.create_table('quiz_answers',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('attempt_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('question_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('answer_text', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        sa.Column('points_earned', sa.Float(), server_default='0.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['attempt_id'], ['quiz_attempts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['quiz_questions.id'])
    )
    op.create_index('ix_quiz_answers_attempt_id', 'quiz_answers', ['attempt_id'])

    # Create discussion_threads
    op.create_table('discussion_threads',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_pinned', sa.Boolean(), server_default='false'),
        sa.Column('is_locked', sa.Boolean(), server_default='false'),
        sa.Column('view_count', sa.Integer(), server_default='0'),
        sa.Column('reply_count', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )
    op.create_index('ix_discussion_threads_course_id', 'discussion_threads', ['course_id'])
    op.create_index('ix_discussion_threads_user_id', 'discussion_threads', ['user_id'])
    op.create_index('ix_discussion_threads_created_at', 'discussion_threads', ['created_at'])

    # Create discussion_replies
    op.create_table('discussion_replies',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('thread_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('parent_reply_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['thread_id'], ['discussion_threads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['parent_reply_id'], ['discussion_replies.id'], ondelete='CASCADE')
    )
    op.create_index('ix_discussion_replies_thread_id', 'discussion_replies', ['thread_id'])
    op.create_index('ix_discussion_replies_user_id', 'discussion_replies', ['user_id'])
    op.create_index('ix_discussion_replies_created_at', 'discussion_replies', ['created_at'])

    # Create live_sessions
    op.create_table('live_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.Column('status', sa.String(50), server_default='scheduled'),
        sa.Column('is_recorded', sa.Boolean(), server_default='false'),
        sa.Column('max_participants', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('extra_data', postgresql.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'])
    )
    op.create_index('ix_live_sessions_course_id', 'live_sessions', ['course_id'])
    op.create_index('ix_live_sessions_scheduled_start', 'live_sessions', ['scheduled_start'])

    # Create session_attendance
    op.create_table('session_attendance',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['live_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )
    op.create_index('ix_session_attendance_session_id', 'session_attendance', ['session_id'])
    op.create_index('ix_session_attendance_user_id', 'session_attendance', ['user_id'])

    # Create session_recordings
    op.create_table('session_recordings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recording_url', sa.String(500), nullable=False),
        sa.Column('recording_type', sa.String(50), server_default='video'),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['live_sessions.id'], ondelete='CASCADE')
    )
    op.create_index('ix_session_recordings_session_id', 'session_recordings', ['session_id'])

    # Create video_call_rooms
    op.create_table('video_call_rooms',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('room_name', sa.String(255), nullable=False),
        sa.Column('room_url', sa.String(500), nullable=True),
        sa.Column('status', sa.String(20), server_default='idle'),
        sa.Column('is_locked', sa.Boolean(), server_default='false'),
        sa.Column('max_participants', sa.Integer(), server_default='50'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('course_id'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE')
    )
    op.create_index('ix_video_call_rooms_course_id', 'video_call_rooms', ['course_id'])

    # Create video_call_participants
    op.create_table('video_call_participants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('room_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['room_id'], ['video_call_rooms.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )
    op.create_index('ix_video_call_participants_room_id', 'video_call_participants', ['room_id'])
    op.create_index('ix_video_call_participants_user_id', 'video_call_participants', ['user_id'])

    # Create notifications
    op.create_table('notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', postgresql.ENUM('GRADE', 'SUBMISSION', 'PEER_REVIEW', 'ASSIGNMENT_CREATED', 'QUIZ_CREATED', 'DISCUSSION_REPLY', 'DEADLINE_REMINDER', name='notificationtype', create_type=False), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign key dependencies)
    op.drop_table('notifications')
    op.drop_table('video_call_participants')
    op.drop_table('video_call_rooms')
    op.drop_table('session_recordings')
    op.drop_table('session_attendance')
    op.drop_table('live_sessions')
    op.drop_table('discussion_replies')
    op.drop_table('discussion_threads')
    op.drop_table('quiz_answers')
    op.drop_table('quiz_attempts')
    op.drop_table('quiz_questions')
    op.drop_table('quizzes')
    op.drop_table('peer_reviews')
    op.drop_table('grades')
    op.drop_table('submission_files')
    op.drop_table('submissions')
    op.drop_table('assignment_files')
    op.drop_table('assignments')
    op.drop_table('user_course_progress')
    op.drop_table('course_materials')
    op.drop_table('course_modules')
    op.drop_table('course_enrollments')
    op.drop_table('courses')
    op.drop_table('password_history')
    op.drop_table('password_reset_tokens')
    op.drop_table('user_profiles')
    op.drop_table('users')
    
    # Drop ENUMs
    op.execute("DROP TYPE IF EXISTS notificationtype")
    op.execute("DROP TYPE IF EXISTS submissionstatus")
    op.execute("DROP TYPE IF EXISTS courserole")
    op.execute("DROP TYPE IF EXISTS userrole")
