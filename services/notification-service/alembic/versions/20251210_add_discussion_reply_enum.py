"""Add DISCUSSION_REPLY and QUIZ_CREATED notification types

Revision ID: d51210_disc_enum
Revises: add_manager_role
Create Date: 2025-12-10
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "d51210_disc_enum"
down_revision = "add_manager_role"
branch_labels = None
basestring = None


def upgrade():
    # Add new enum values for existing PostgreSQL enum type
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'DISCUSSION_REPLY'")
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'QUIZ_CREATED'")


def downgrade():
    # Cannot safely remove enum values in PostgreSQL without recreating the type
    # Leave as no-op to avoid breaking existing data.
    pass


