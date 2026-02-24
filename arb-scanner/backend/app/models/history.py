from datetime import datetime

from pydantic import BaseModel


class PriceSnapshot(BaseModel):
    id: int
    match_id: int
    polymarket_yes: float | None = None
    kalshi_yes: float | None = None
    spread: float | None = None
    fee_adjusted_spread: float | None = None
    recorded_at: datetime