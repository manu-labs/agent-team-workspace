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


class MarketResponse(NormalizedMarket):
    pass
