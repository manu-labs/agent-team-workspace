import enum
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Platform(str, enum.Enum):
    eventbrite = "eventbrite"
    luma = "luma"
    splashthat = "splashthat"
    partiful = "partiful"
    posh = "posh"
    universe = "universe"
    dice = "dice"
    other = "other"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(500))
    date: Mapped[date] = mapped_column(Date)
    time: Mapped[str | None] = mapped_column(String(50), nullable=True)
    rsvp_url: Mapped[str] = mapped_column(String(2000))
    platform: Mapped[Platform] = mapped_column(Enum(Platform))
    source_page_url: Mapped[str] = mapped_column(String(2000))
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
