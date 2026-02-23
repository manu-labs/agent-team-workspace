from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.event import Platform


class EventBase(BaseModel):
    title: str
    date: date
    time: str | None = None
    rsvp_url: str
    platform: Platform
    source_page_url: str


class EventCreate(EventBase):
    raw_text: str | None = None


class EventResponse(EventBase):
    id: UUID
    scraped_at: datetime
    raw_text: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
