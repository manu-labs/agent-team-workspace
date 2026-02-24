"""Polymarket ingester -- fetches markets from Gamma API."""

import logging

from app.models.market import NormalizedMarket

logger = logging.getLogger(__name__)

GAMMA_API_URL = "https://gamma-api.polymarket.com/markets"


async def fetch_polymarket_markets() -> list[NormalizedMarket]:
    """Fetch active markets from Polymarket Gamma API.

    Uses offset pagination: ?active=true&closed=false&offset=0&limit=100
    Normalize each market into NormalizedMarket schema.

    TODO (#194): Implement pagination and normalization.
    """
    logger.info("Polymarket ingester not yet implemented")
    return []