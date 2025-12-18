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


def downgrade() -> None:
    pass
