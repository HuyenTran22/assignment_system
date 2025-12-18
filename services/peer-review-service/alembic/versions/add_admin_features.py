"""Add admin features and password management

Revision ID: add_admin_features
Revises: 435cfcf3ee95
Create Date: 2025-11-28 12:17:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_admin_features'
down_revision = '435cfcf3ee95'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to users table
    op.add_column('users', sa.Column('student_id', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('class_name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('created_by', sa.UUID(), nullable=True))
    op.add_column('users', sa.Column('last_password_change', sa.TIMESTAMP(), nullable=True))
    
    # Add foreign key for created_by
    op.create_foreign_key('fk_users_created_by', 'users', 'users', ['created_by'], ['id'])
    
    # Add unique constraint for student_id
    op.create_unique_constraint('uq_users_student_id', 'users', ['student_id'])
    
    # Create password_reset_tokens table
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.TIMESTAMP(), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
    op.create_index('ix_password_reset_tokens_user_id', 'password_reset_tokens', ['user_id'])
    op.create_index('ix_password_reset_tokens_token', 'password_reset_tokens', ['token'])
    
    # Create password_history table
    op.create_table(
        'password_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_password_history_user_id', 'password_history', ['user_id'])


def downgrade() -> None:
    # Drop tables
    op.drop_index('ix_password_history_user_id', table_name='password_history')
    op.drop_table('password_history')
    
    op.drop_index('ix_password_reset_tokens_token', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_user_id', table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')
    
    # Drop constraints and columns from users
    op.drop_constraint('uq_users_student_id', 'users', type_='unique')
    op.drop_constraint('fk_users_created_by', 'users', type_='foreignkey')
    
    op.drop_column('users', 'last_password_change')
    op.drop_column('users', 'created_by')
    op.drop_column('users', 'must_change_password')
    op.drop_column('users', 'class_name')
    op.drop_column('users', 'student_id')
