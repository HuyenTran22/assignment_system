"""add quizzes

Revision ID: add_quizzes
Revises: add_certificates
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_quizzes'
down_revision = 'add_live_classes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create quizzes table
    op.create_table(
        'quizzes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('time_limit_minutes', sa.Integer(), nullable=True),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('passing_score', sa.Float(), nullable=False, server_default='60.0'),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('shuffle_questions', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    )
    op.create_index('ix_quizzes_course_id', 'quizzes', ['course_id'])

    # Create quiz_questions table
    op.create_table(
        'quiz_questions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('quiz_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('question_type', sa.String(50), nullable=False),
        sa.Column('options', postgresql.JSON(), nullable=True),
        sa.Column('correct_answer', sa.Text(), nullable=False),
        sa.Column('points', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_quiz_questions_quiz_id', 'quiz_questions', ['quiz_id'])

    # Create quiz_attempts table
    op.create_table(
        'quiz_attempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('quiz_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('percentage', sa.Float(), nullable=True),
        sa.Column('is_passed', sa.Boolean(), nullable=True),
        sa.Column('time_taken_seconds', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index('ix_quiz_attempts_quiz_id', 'quiz_attempts', ['quiz_id'])
    op.create_index('ix_quiz_attempts_user_id', 'quiz_attempts', ['user_id'])

    # Create quiz_answers table
    op.create_table(
        'quiz_answers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('attempt_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('question_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('answer_text', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        sa.Column('points_earned', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['attempt_id'], ['quiz_attempts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['quiz_questions.id']),
    )
    op.create_index('ix_quiz_answers_attempt_id', 'quiz_answers', ['attempt_id'])
    op.create_index('ix_quiz_answers_question_id', 'quiz_answers', ['question_id'])


def downgrade() -> None:
    op.drop_index('ix_quiz_answers_question_id', table_name='quiz_answers')
    op.drop_index('ix_quiz_answers_attempt_id', table_name='quiz_answers')
    op.drop_table('quiz_answers')
    op.drop_index('ix_quiz_attempts_user_id', table_name='quiz_attempts')
    op.drop_index('ix_quiz_attempts_quiz_id', table_name='quiz_attempts')
    op.drop_table('quiz_attempts')
    op.drop_index('ix_quiz_questions_quiz_id', table_name='quiz_questions')
    op.drop_table('quiz_questions')
    op.drop_index('ix_quizzes_course_id', table_name='quizzes')
    op.drop_table('quizzes')

