import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RSVPStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    success = "success"
    failed = "failed"
    already_full = "already_full"
    skipped = "skipped"
    manual_required = "manual_required"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class RSVP(Base):
    __tablename__ = "rsvps"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"))
    match_score: Mapped[float] = mapped_column(Float)
    status: Mapped[RSVPStatus] = mapped_column(Enum(RSVPStatus), default=RSVPStatus.pending)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user = relationship("User")
    event = relationship("Event")
