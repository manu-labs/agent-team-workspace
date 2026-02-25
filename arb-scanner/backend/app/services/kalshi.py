"""Kalshi ingester — fetches open markets from the Kalshi trade API."""

import asyncio
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import httpx

from app.config import settings
from app.database import get_db
from app.models.market import NormalizedMarket
from app.services.kalshi_auth import get_auth_headers

logger = logging.getLogger(__name__)

KALSHI_MARKETS_URL = "https://api.elections.kalshi.com/trade-api/v2/markets"
KALSHI_SERIES_URL = "https://api.elections.kalshi.com/trade-api/v2/series"
_MARKETS_PATH = "/trade-api/v2/markets"   # path component for auth signing
_SERIES_PATH = "/trade-api/v2/series"     # path component for auth signing
_PAGE_SIZE = 1000
_RETRIES = 3
_PLATFORM = "kalshi"

# Regex for slugifying series titles to match Kalshi's frontend URL format
_NON_ALNUM_RE = re.compile(r"[^a-z0-9 ]")
_MULTI_HYPHEN_RE = re.compile(r"-+")
_WHITESPACE_RE = re.compile(r"\s+")


_TICKER_DATE_RE = re.compile(r"(\d{2})([A-Z]{3})(\d{2})")
_MONTH_MAP = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}


def _extract_ticker_date(event_ticker: str) -> datetime | None:
    """Extract event date from Kalshi event ticker.

    Kalshi encodes the actual event date in the ticker after the first hyphen.
    E.g. "KXNBAGAME-26FEB25OKCDET" → Feb 25, 2026 (end of day UTC).
    """
    if not event_ticker or "-" not in event_ticker:
        return None
    # Search the portion after the first hyphen
    suffix = event_ticker.split("-", 1)[1]
    m = _TICKER_DATE_RE.match(suffix)
    if not m:
        return None
    day_str, mon_str, year_str = m.groups()
    month = _MONTH_MAP.get(mon_str)
    if not month:
        return None
    try:
        year = 2000 + int(year_str)
        day = int(day_str)
        return datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)
    except (ValueError, OverflowError):
        return None


def _slugify(text: str) -> str:
    """Convert text to a URL slug matching Kalshi's frontend format.

    E.g. "Counter-Strike 2 Game" -> "counterstrike-2-game"
         "Elon Mars" -> "elon-mars"
    """
    text = text.lower().strip()
    text = _NON_ALNUM_RE.sub("", text)
    text = _WHITESPACE_RE.sub("-", text)
    text = _MULTI_HYPHEN_RE.sub("-", text)
    return text.strip("-")


def _auth(method: str, path: str) -> dict:
    """Return Kalshi auth headers if API keys are configured, else empty dict."""
    return get_auth_headers(settings.KALSHI_API_KEY_ID, settings.KALSHI_API_KEY, method, path)


async def _fetch_series_data(client: httpx.AsyncClient) -> dict[str, dict]:
    """Fetch all Kalshi series and return series_ticker -> {category, title} mapping."""
    series_data: dict[str, dict] = {}
    cursor = None

    while True:
        params: dict = {"limit": _PAGE_SIZE}
        if cursor:
            params["cursor"] = cursor

        backoff = 1.0
        success = False

        for attempt in range(_RETRIES):
            try:
                resp = await client.get(
                    KALSHI_SERIES_URL,
                    params=params,
                    headers=_auth("GET", _SERIES_PATH),
                )
                if resp.status_code == 429:
                    wait = backoff * 3
                    logger.warning("Kalshi series rate-limited, backing off %.0fs", wait)
                    await asyncio.sleep(wait)
                    backoff *= 2
                    continue
                resp.raise_for_status()
                data = resp.json()
                for s in data.get("series") or []:
                    ticker = s.get("ticker") or s.get("series_ticker") or ""
                    category = s.get("category") or ""
                    title = s.get("title") or ""
                    if ticker:
                        series_data[ticker] = {"category": category, "title": title}
                cursor = data.get("cursor")
                series_count = len(data.get("series") or [])
                success = True
                if not cursor or series_count < _PAGE_SIZE:
                    logger.info("Kalshi: loaded %d series (category + title)", len(series_data))
                    return series_data
                break
            except httpx.HTTPStatusError as exc:
                logger.warning("Kalshi series HTTP %s (attempt %d)", exc.response.status_code, attempt + 1)
                if exc.response.status_code < 500:
                    return series_data
            except httpx.HTTPError as exc:
                logger.warning("Kalshi series network error (attempt %d): %s", attempt + 1, exc)
            await asyncio.sleep(backoff)
            backoff *= 2

        if not success:
            logger.warning("Failed to fetch Kalshi series, proceeding without series data")
            return series_data

    return series_data


def _normalize(raw: dict, series_data: dict[str, dict]) -> NormalizedMarket | None:
    """Convert a raw Kalshi market dict to NormalizedMarket. Returns None if malformed."""
    try:
        ticker = raw.get("ticker")
        if not ticker:
            return None

        title = (raw.get("title") or raw.get("question") or "").strip()
        if not title:
            return None

        # Multi-outcome events share a generic title (e.g. "Best AI in Feb 2026?")
        # with the specific outcome in subtitle (e.g. "Claude:: Anthropic").
        # Append ALL non-trivial sub-titles so the question captures both sides
        # (critical for sports: "Winner?" needs both team names for matching).
        subtitle = (raw.get("subtitle") or "").strip()
        yes_sub = (raw.get("yes_sub_title") or "").strip()
        no_sub = (raw.get("no_sub_title") or "").strip()

        extras: list[str] = []
        for val in [subtitle, yes_sub, no_sub]:
            if val and val.lower() not in ("yes", "no") and val not in extras:
                extras.append(val)
        if extras:
            title = f"{title} — {' / '.join(extras)}"

        event_ticker = (raw.get("event_ticker") or "").strip()

        # Kalshi prices are in cents (0-100) — normalize to 0.0-1.0
        # Use last_price (what Kalshi shows on their site) rather than yes_ask,
        # which is the ask side of the order book and wildly inflated in illiquid markets.
        # Fallback chain: last_price → midpoint(yes_bid, yes_ask) → yes_ask alone
        last_price_raw = raw.get("last_price", 0)
        yes_ask_raw = raw.get("yes_ask", 0)
        yes_bid_raw = raw.get("yes_bid", 0)

        if last_price_raw and last_price_raw > 0:
            yes_price = max(0.0, min(1.0, float(last_price_raw) / 100.0))
        elif yes_ask_raw and yes_bid_raw:
            yes_price = max(0.0, min(1.0, (float(yes_ask_raw) + float(yes_bid_raw)) / 200.0))
        else:
            yes_price = max(0.0, min(1.0, float(yes_ask_raw or 0) / 100.0))

        # Read no_price from the actual NO-side order book instead of assuming 1 - yes
        # Use no_ask (buy price) to match Kalshi's website and represent actual execution cost
        # Fallback chain: no_ask → no_bid → 1 - yes_price
        no_ask_raw = raw.get("no_ask", 0)
        no_bid_raw = raw.get("no_bid", 0)

        if no_ask_raw and no_ask_raw > 0:
            no_price = max(0.0, min(1.0, float(no_ask_raw) / 100.0))
        elif no_bid_raw and no_bid_raw > 0:
            no_price = max(0.0, min(1.0, float(no_bid_raw) / 100.0))
        else:
            no_price = max(0.0, min(1.0, 1.0 - yes_price))

        # Volume
        volume = float(raw.get("volume") or raw.get("volume_24h") or 0)

        # Derive series_ticker from event_ticker (the markets API doesn't return
        # series_ticker directly — it's on the event object).  The series_ticker
        # is always the first segment of the event_ticker before the first hyphen.
        # E.g. "KXDOTA2GAME-26FEB24LIQUIDAUR" → "KXDOTA2GAME"
        series_ticker = event_ticker.split("-")[0] if event_ticker else ""
        series_info = series_data.get(series_ticker, {})
        category = series_info.get("category", "")
        series_title = series_info.get("title", "")

        # End date — prefer ticker-encoded event date (actual game/event day),
        # then expected_expiration_time, then close_time (settlement deadline,
        # often ~15 days after the event for sports markets).
        end_date = _extract_ticker_date(event_ticker)
        if end_date is None:
            close_raw = raw.get("expected_expiration_time") or raw.get("close_time")
            if close_raw:
                try:
                    end_date = datetime.fromisoformat(close_raw.replace("Z", "+00:00"))
                except (ValueError, AttributeError):
                    pass

        # If the series title adds context not already in the market title,
        # prepend it.  Critical for multi-outcome events (sports game winner,
        # crypto price bins) where the individual market title is generic
        # ("Winner?") and the series title has the event context
        # ("Oklahoma City Thunder at Detroit Pistons").
        if series_title and series_title.lower() not in title.lower():
            title = f"{series_title}: {title}"

        # Build Kalshi frontend URL
        # Format: /markets/{series_ticker}/{slug}/{event_ticker}
        # Slug is the series title slugified (lowercased, non-alnum removed, spaces to hyphens)
        slug = _slugify(series_title) if series_title else ""

        if series_ticker and slug and event_ticker:
            url = f"https://kalshi.com/markets/{series_ticker.lower()}/{slug}/{event_ticker.lower()}"
        elif series_ticker and slug:
            url = f"https://kalshi.com/markets/{series_ticker.lower()}/{slug}"
        else:
            # Fallback to search if we can't build a proper URL
            url = f"https://kalshi.com/search?q={quote(title)}&order_by=querymatch"

        return NormalizedMarket(
            id=f"{_PLATFORM}:{ticker}",
            platform=_PLATFORM,
            question=title,
            category=category,
            yes_price=yes_price,
            no_price=no_price,
            volume=volume,
            end_date=end_date,
            url=url,
            raw_data=raw,
            last_updated=datetime.now(timezone.utc),
        )
    except Exception as exc:
        logger.warning("Failed to normalize Kalshi market %s: %s", raw.get("ticker"), exc)
        return None


async def fetch_kalshi_markets() -> list[NormalizedMarket]:
    """Fetch Kalshi markets expiring within MATCH_EXPIRY_DAYS with MIN_MATCH_VOLUME."""
    now = datetime.now(timezone.utc)
    expiry_cutoff = now + timedelta(days=settings.MATCH_EXPIRY_DAYS)

    # Server-side timestamp filters (Unix seconds) — only fetch markets closing
    # between now and our expiry cutoff, so the API returns far fewer pages.
    min_close_ts = int(now.timestamp())
    max_close_ts = int(expiry_cutoff.timestamp())

    authenticated = bool(settings.KALSHI_API_KEY_ID and settings.KALSHI_API_KEY)
    if authenticated:
        logger.info("Kalshi: using RSA-PSS authenticated requests")
    else:
        logger.info("Kalshi: no API keys configured, using unauthenticated requests")

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        series_data = await _fetch_series_data(client)

        markets: list[NormalizedMarket] = []
        low_volume_filtered = 0
        cursor = None

        while True:
            params: dict = {
                "status": "open",
                "limit": _PAGE_SIZE,
                "min_close_ts": min_close_ts,
                "max_close_ts": max_close_ts,
            }
            if cursor:
                params["cursor"] = cursor

            backoff = 1.0
            raw_markets = []

            for attempt in range(_RETRIES):
                try:
                    resp = await client.get(
                        KALSHI_MARKETS_URL,
                        params=params,
                        headers=_auth("GET", _MARKETS_PATH),
                    )
                    if resp.status_code == 429:
                        wait = backoff * 3
                        logger.warning("Kalshi rate-limited, backing off %.0fs", wait)
                        await asyncio.sleep(wait)
                        backoff *= 2
                        continue
                    resp.raise_for_status()
                    data = resp.json()
                    raw_markets = data.get("markets") or []
                    cursor = data.get("cursor")
                    break
                except httpx.HTTPStatusError as exc:
                    logger.warning("Kalshi HTTP %s (attempt %d)", exc.response.status_code, attempt + 1)
                    if exc.response.status_code < 500:
                        break
                except httpx.HTTPError as exc:
                    logger.warning("Kalshi network error (attempt %d): %s", attempt + 1, exc)
                await asyncio.sleep(backoff)
                backoff *= 2

            if not raw_markets:
                logger.debug("Kalshi: no markets at cursor=%s — stopping", cursor)
                break

            for raw in raw_markets:
                market = _normalize(raw, series_data)
                if not market:
                    continue

                # Skip low-volume markets (expiry filtering is done server-side)
                if market.volume < settings.MIN_MATCH_VOLUME:
                    low_volume_filtered += 1
                    continue

                markets.append(market)

            logger.debug("Kalshi: fetched %d markets (cursor=%s)", len(raw_markets), cursor)

            if not cursor or len(raw_markets) < _PAGE_SIZE:
                break  # last page

    logger.info(
        "Kalshi: %d markets kept (low-volume: %d) [server-filtered to %d-%d day window]",
        len(markets), low_volume_filtered, 0, settings.MATCH_EXPIRY_DAYS,
    )
    return markets


async def ingest_kalshi() -> dict:
    """Fetch Kalshi markets and upsert into the database.

    Returns: {"fetched": N, "upserted": N, "errors": N, "market_ids": [...]}
    """
    try:
        markets = await fetch_kalshi_markets()
    except Exception as exc:
        logger.error("Kalshi ingestion failed: %s", exc, exc_info=True)
        return {"fetched": 0, "upserted": 0, "errors": 1, "market_ids": []}

    db = await get_db()
    upserted = 0
    errors = 0

    for m in markets:
        try:
            await db.execute(
                """
                INSERT INTO markets (id, platform, question, category, yes_price, no_price,
                                     volume, end_date, url, raw_data, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    question     = excluded.question,
                    category     = excluded.category,
                    yes_price    = excluded.yes_price,
                    no_price     = excluded.no_price,
                    volume       = excluded.volume,
                    end_date     = excluded.end_date,
                    url          = excluded.url,
                    raw_data     = excluded.raw_data,
                    last_updated = excluded.last_updated
                """,
                (
                    m.id, m.platform, m.question, m.category,
                    m.yes_price, m.no_price, m.volume,
                    m.end_date.isoformat() if m.end_date else None,
                    m.url, '{}', m.last_updated.isoformat(),
                ),
            )
            upserted += 1
        except Exception as exc:
            logger.error("Failed to upsert Kalshi market %s: %s", m.id, exc)
            errors += 1

    await db.commit()
    logger.info(
        "Kalshi ingest complete — fetched: %d, upserted: %d, errors: %d",
        len(markets), upserted, errors,
    )
    return {"fetched": len(markets), "upserted": upserted, "errors": errors, "market_ids": [m.id for m in markets]}