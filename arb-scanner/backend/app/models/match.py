from datetime import datetime

from pydantic import BaseModel


class MatchedPair(BaseModel):
    id: int
    polymarket_id: str
    kalshi_id: str
    confidence: float = 0
    spread: float = 0
    fee_adjusted_spread: float = 0
    polymarket_yes: float | None = None
    kalshi_yes: float | None = None
    polymarket_volume: float | None = None
    kalshi_volume: float | None = None
    question: str | None = None
    last_updated: datetime


class MatchResponse(MatchedPair):
    polymarket_question: str | None = None
    kalshi_question: str | None = None
    polymarket_url: str | None = None
    kalshi_url: str | None = None