from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.rsvp import RSVPStatus


class RSVPBase(BaseModel):
    user_id: UUID
    event_id: UUID
    match_score: float


class RSVPCreate(RSVPBase):
    pass


class RSVPResponse(RSVPBase):
    id: UUID
    status: RSVPStatus
    error_message: str | None = None
    attempted_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
