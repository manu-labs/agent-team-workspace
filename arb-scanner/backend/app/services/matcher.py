"""Groq LLM matcher -- two-pass matching between Polymarket and Kalshi markets.

Uses httpx to call Groq API directly (the groq library has connection
issues in Railway network -- same lesson from Auto-RSVP).
"""

import logging

from app.models.market import NormalizedMarket

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


async def match_markets(
    polymarket: list[NormalizedMarket],
    kalshi: list[NormalizedMarket],
) -> list[dict]:
    """Two-pass LLM matching.

    Pass 1: Batch markets by category, send both platform lists to Groq,
            return candidate pairs with confidence scores.
    Pass 2: Confirm matches using full resolution criteria, flag differences.

    Cache confirmed matches to avoid re-matching on subsequent polls.

    TODO (#196): Implement Groq API calls via httpx.
    """
    logger.info("LLM matcher not yet implemented")
    return []