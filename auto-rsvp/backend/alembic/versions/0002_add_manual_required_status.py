"""Add manual_required to rsvpstatus enum.

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-23

The Python RSVPStatus enum already includes manual_required (added in PR #164),
but the PostgreSQL enum type created in 0001 only has the original 6 values.
Without this migration, storing manual_required in the DB raises a DataError.
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE rsvpstatus ADD VALUE IF NOT EXISTS 'manual_required'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an enum type.
    # To fully reverse this, you would need to recreate the type and column.
    pass
