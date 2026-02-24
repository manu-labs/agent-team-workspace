import asyncio
import logging
import re
from datetime import date, datetime, timezone
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import delete, select
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
# Matches short dates like "2/28/26" or "2/28/2026"
_DATE_SHORT_RE = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b")
_BULLET_RE = re.compile(r"^[\s\u2022\-\*]+")

# Keywords that, combined with "2026", identify a section heading to start from
_SECTION_2026_KEYWORDS = ["rsvp", "added", "event", "list"]


def _detect_platform(url: str) -> Platform:
    try:
        netloc = urlparse(url).netloc.lower().removeprefix("www.")
        return PLATFORM_MAP.get(netloc, Platform.other)
    except Exception:
        return Platform.other


def _parse_date(text: str) -> date | None:
    """Parse 'Month DD, YYYY' style dates."""
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


def _parse_date_short(text: str) -> date | None:
    """Parse short M/D/YY or M/D/YYYY dates like 'Added 2/28/26'."""
    m = _DATE_SHORT_RE.search(text)
    if not m:
        return None
    month, day, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if year < 100:
        year += 2000
    try:
        return date(year, month, day)
    except ValueError:
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

    Only scrapes the "Recently Added 2026 RSVPs" section and subsequent 2026
    content. Stops when a "2025" section heading or date is encountered.
    Falls back to full-page parsing with a year<2026 safety filter if no
    2026 section heading is found.
    """
    soup = BeautifulSoup(html, "html.parser")
    scraped_at = datetime.now(timezone.utc)

    content = (
        soup.find("main")
        or soup.find("div", class_=re.compile(r"sqs-block-html"))
        or soup.body
        or soup
    )

    # --- Pass 1: find where the 2026 section starts ---
    # Look for a heading containing "2026" AND a relevant keyword.
    # This is resilient to minor header text changes.
    start_element = None
    for el in content.find_all(["h1", "h2", "h3", "h4", "p"]):
        text = el.get_text(" ", strip=True).lower()
        if "2026" in text and any(kw in text for kw in _SECTION_2026_KEYWORDS):
            start_element = el
            logger.info("Found 2026 section heading: %r", el.get_text(" ", strip=True)[:80])
            break

    if start_element is None:
        logger.warning(
            "2026 section heading not found on %s — falling back to full-page parse "
            "(year<2026 safety filter will apply)", SOURCE_URL
        )
        elements = content.find_all(["p", "li"])
    else:
        # Traverse all p/li elements that follow the 2026 heading
        elements = start_element.find_all_next(["p", "li"])

    # --- Pass 2: parse events, stopping at 2025 boundary ---
    current_date: date | None = None
    events: list[dict] = []
    seen_urls: set[str] = set()

    for element in elements:
        strong = element.find("strong")
        if strong:
            strong_text = strong.get_text(" ", strip=True)

            # Stop if we hit any text containing "2025" (section heading or date)
            if "2025" in strong_text:
                logger.info(
                    "Reached 2025 boundary (%r) — stopping scrape", strong_text[:60]
                )
                break

            # Try "Month DD, YYYY" date format
            parsed = _parse_date(strong_text)
            if parsed:
                if parsed.year < 2026:
                    logger.info("Reached pre-2026 date (%s) — stopping scrape", parsed)
                    break
                current_date = parsed
                continue

            # Try short "M/D/YY" date format (e.g. "Added 2/28/26")
            parsed_short = _parse_date_short(strong_text)
            if parsed_short:
                if parsed_short.year < 2026:
                    logger.info("Reached pre-2026 date (%s) — stopping scrape", parsed_short)
                    break
                current_date = parsed_short
                continue

        if current_date is None:
            continue

        # Safety fallback: skip any event dated before 2026
        if current_date.year < 2026:
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

    Purges stale pre-2026 events before inserting. Returns counts:
    {"found": N, "new": N, "updated": N, "errors": N, "purged": N}.
    """
    html = await _fetch_with_retry(SOURCE_URL)
    if html is None:
        logger.error("Failed to fetch %s after retries", SOURCE_URL)
        return {"found": 0, "new": 0, "updated": 0, "errors": 1, "purged": 0}

    try:
        raw_events = _parse_events(html)
    except Exception as exc:
        logger.error("Failed to parse events page: %s", exc, exc_info=True)
        return {"found": 0, "new": 0, "updated": 0, "errors": 1, "purged": 0}

    logger.info("Scraped %d events from %s", len(raw_events), SOURCE_URL)

    # Purge stale pre-2026 events from the database
    purge_result = await db.execute(
        delete(Event).where(Event.date < date(2026, 1, 1))
    )
    purged_count = purge_result.rowcount
    if purged_count:
        logger.info("Purged %d stale pre-2026 events from DB", purged_count)

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
        "Upsert complete — new: %d, updated: %d, errors: %d, purged: %d",
        new_count, updated_count, error_count, purged_count,
    )
    return {
        "found": len(raw_events),
        "new": new_count,
        "updated": updated_count,
        "errors": error_count,
        "purged": purged_count,
    }