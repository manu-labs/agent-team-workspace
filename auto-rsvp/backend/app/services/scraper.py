"""Event scraper service — parses rsvpatx.com into structured event data.

Implementation in #148.
"""

from app.schemas.event import EventCreate


async def scrape_events() -> list[EventCreate]:
    """Scrape rsvpatx.com and return structured event data."""
    raise NotImplementedError("Event scraping not yet implemented — see #148")
