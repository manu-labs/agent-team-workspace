import asyncio
import logging
import re
from datetime import date, datetime, timezone
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event, Platform

logger = logging.getLogger(__name__)

SOURCE_URL = "https://rsvpatx.com/rsvp-list"

PLATFORM_MAP: dict[str, Platform] = {
    "eventbrite.com": Platform.eventbrite,
    "eventbrite.ca": Platform.eventbrite,
    "eventbrite.co.uk": Platform.eventbrite,
    "eventbrite.de": Platform.eventbrite,
    "eventbrite.ie": Platform.eventbrite,
    "lu.ma": Platform.luma,
    "splashthat.com": Platform.splashthat,
    "partiful.com": Platform.partiful,
    "posh.vip": Platform.posh,
    "universe.com": Platform.universe,
    "dice.fm": Platform.dice,
}

_DATE_RE = re.compile(
    r"(January|February|March|April|May|June|July|August"
    r"|September|October|November|December)\s+\d{1,2},?\s+\d{4}",
    re.IGNORECASE,
)
_DATE_FMTS = ["%B %d, %Y", "%B %d %Y", "%b %d, %Y", "%b %d %Y"]
_BULLET_RE = re.compile(r"^[\s\u2022\-\*]+")


def _detect_platform(url: str) -> Platform:
    try:
        netloc = urlparse(url).netloc.lower().removeprefix("www.")
        return PLATFORM_MAP.get(netloc, Platform.other)
    except Exception:
        return Platform.other


def _parse_date(text: str) -> date | None:
    m = _DATE_RE.search(text)
    if not m:
        return None
    raw = m.group(0).replace(",", "")
    for fmt in _DATE_FMTS:
        try:
            return datetime.strptime(raw, fmt.replace(",", "")).date()
        except ValueError:
            continue
    return None


async def _fetch_with_retry(url: str, retries: int = 3) -> str | None:
    """Fetch a URL with exponential backoff. Returns HTML text or None on failure."""
    backoff = 1.0
    async with httpx.AsyncClient(
        timeout=30,
        follow_redirects=True,
        headers={"User-Agent": "Mozilla/5.0 (compatible; AutoRSVP/1.0)"},
    ) as client:
        for attempt in range(retries):
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                return resp.text
            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "HTTP %s fetching %s (attempt %d)",
                    exc.response.status_code, url, attempt + 1,
                )
                if exc.response.status_code < 500:
                    break  # do not retry 4xx errors
            except httpx.HTTPError as exc:
                logger.warning("Network error fetching %s (attempt %d): %s", url, attempt + 1, exc)

            if attempt < retries - 1:
                await asyncio.sleep(backoff)
                backoff *= 2

    return None


def _parse_events(html: str) -> list[dict]:
    """Parse the rsvpatx.com event list HTML into a list of raw event dicts.

    Page structure (Squarespace): date headers are <strong> tags inside <p> elements,
    followed by <p> elements containing bullet text and <a> RSVP links.
    """
    soup = BeautifulSoup(html, "html.parser")
    scraped_at = datetime.now(timezone.utc)

    # Find the main content block. Squarespace uses sqs-block-html; fall back to body.
    content = (
        soup.find("div", class_=re.compile(r"sqs-block-html"))
        or soup.find("main")
        or soup.body
        or soup
    )

    current_date: date | None = None
    events: list[dict] = []
    seen_urls: set[str] = set()

    for element in content.find_all(["p", "li"]):
        strong = element.find("strong")
        if strong:
            parsed = _parse_date(strong.get_text(" ", strip=True))
            if parsed:
                current_date = parsed
                continue

        if current_date is None:
            continue

        for link in element.find_all("a"):
            href = (link.get("href") or "").strip()
            if not href or href.startswith("#") or href.startswith("mailto:"):
                continue
            if href in seen_urls:
                continue

            raw_text = element.get_text(" ", strip=True)
            title = _BULLET_RE.sub("", raw_text).strip() or link.get_text(strip=True) or href

            seen_urls.add(href)
            events.append(
                {
                    "title": title,
                    "date": current_date,
                    "rsvp_url": href,
                    "platform": _detect_platform(href),
                    "raw_text": raw_text,
                    "scraped_at": scraped_at,
                }
            )

    return events


async def scrape_and_upsert(db: AsyncSession) -> dict[str, int]:
    """Scrape rsvpatx.com and upsert events into the database.

    Returns counts: {"found": N, "new": N, "updated": N, "errors": N}.
    """
    html = await _fetch_with_retry(SOURCE_URL)
    if html is None:
        logger.error("Failed to fetch %s after retries", SOURCE_URL)
        return {"found": 0, "new": 0, "updated": 0, "errors": 1}

    try:
        raw_events = _parse_events(html)
    except Exception as exc:
        logger.error("Failed to parse events page: %s", exc, exc_info=True)
        return {"found": 0, "new": 0, "updated": 0, "errors": 1}

    logger.info("Scraped %d events from %s", len(raw_events), SOURCE_URL)

    new_count = updated_count = error_count = 0

    for ev in raw_events:
        try:
            result = await db.execute(select(Event).where(Event.rsvp_url == ev["rsvp_url"]))
            existing = result.scalar_one_or_none()

            if existing is None:
                db.add(
                    Event(
                        title=ev["title"],
                        date=ev["date"],
                        rsvp_url=ev["rsvp_url"],
                        platform=ev["platform"],
                        source_page_url=SOURCE_URL,
                        scraped_at=ev["scraped_at"],
                        raw_text=ev["raw_text"],
                    )
                )
                new_count += 1
            else:
                existing.title = ev["title"]
                existing.date = ev["date"]
                existing.platform = ev["platform"]
                existing.scraped_at = ev["scraped_at"]
                existing.raw_text = ev["raw_text"]
                updated_count += 1

        except Exception as exc:
            logger.error("Error upserting event %s: %s", ev.get("rsvp_url"), exc, exc_info=True)
            error_count += 1

    await db.commit()
    logger.info(
        "Upsert complete — new: %d, updated: %d, errors: %d",
        new_count, updated_count, error_count,
    )
    return {"found": len(raw_events), "new": new_count, "updated": updated_count, "errors": error_count}
