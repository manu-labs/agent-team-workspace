"""Kalshi ingester -- fetches markets from Kalshi API."""

import logging

from app.models.market import NormalizedMarket

logger = logging.getLogger(__name__)

KALSHI_API_URL = "https://api.elections.kalshi.com/trade-api/v2/markets"
KALSHI_SERIES_URL = "https://api.elections.kalshi.com/trade-api/v2/series"


async def fetch_kalshi_markets() -> list[NormalizedMarket]:
    """Fetch open markets from Kalshi API.

    Uses cursor pagination: ?status=open&cursor=<next_cursor>&limit=100
    Use /series endpoint for category enrichment.

    TODO (#195): Implement cursor pagination and normalization.
    """
    logger.info("Kalshi ingester not yet implemented")
    return []