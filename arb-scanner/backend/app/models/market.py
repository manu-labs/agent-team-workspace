from datetime import datetime

from pydantic import BaseModel


class NormalizedMarket(BaseModel):
    id: str
    platform: str
    question: str
    category: str = ""
    yes_price: float
    no_price: float
    volume: float = 0
    end_date: datetime | None = None
    url: str = ""
    clob_token_ids: str = ""
    raw_data: dict = {}
    last_updated: datetime
    # Sports matching fields — populated by normalizers, not persisted to DB
    event_slug: str = ""          # Polymarket event slug (for deterministic sports matching)
    event_ticker: str = ""        # Kalshi event_ticker (for deterministic sports matching)
    sports_market_type: str = ""  # Polymarket sportsMarketType (e.g. "moneyline")


class MarketResponse(NormalizedMarket):
    pass
