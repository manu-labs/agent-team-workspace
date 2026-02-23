"""Initial schema — creates users, events, and rsvps tables.

Revision ID: 0001
Revises:
Create Date: 2026-02-23

Notes:
- events.rsvp_url has a unique index for upsert deduplication in the scraper
- users.email has a unique index for signup uniqueness enforcement
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("interests_description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("time", sa.String(50), nullable=True),
        sa.Column("rsvp_url", sa.String(2000), nullable=False),
        sa.Column(
            "platform",
            sa.Enum(
                "eventbrite", "luma", "splashthat", "partiful",
                "posh", "universe", "dice", "other",
                name="platform",
            ),
            nullable=False,
        ),
        sa.Column("source_page_url", sa.String(2000), nullable=False),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    # Unique index enables upsert deduplication: re-scraping never creates duplicates
    op.create_index("ix_events_rsvp_url", "events", ["rsvp_url"], unique=True)
    # Index on date for efficient filtering
    op.create_index("ix_events_date", "events", ["date"])

    op.create_table(
        "rsvps",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("match_score", sa.Float(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending", "in_progress", "success", "failed", "already_full", "skipped",
                name="rsvpstatus",
            ),
            default="pending",
            nullable=False,
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("rsvps")
    op.execute("DROP TYPE IF EXISTS rsvpstatus")
    op.drop_index("ix_events_date", "events")
    op.drop_index("ix_events_rsvp_url", "events")
    op.drop_table("events")
    op.execute("DROP TYPE IF EXISTS platform")
    op.drop_index("ix_users_email", "users")
    op.drop_table("users")
