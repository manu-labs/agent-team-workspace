"""Kalshi ingester — fetches open markets from the Kalshi trade API."""

import asyncio
import json
import logging
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


def _auth(method: str, path: str) -> dict:
    """Return Kalshi auth headers if API keys are configured, else empty dict."""
    return get_auth_headers(settings.KALSHI_API_KEY_ID, settings.KALSHI_API_KEY, method, path)


async def _fetch_series_categories(client: httpx.AsyncClient) -> dict[str, str]:
    """Fetch all Kalshi series and return series_ticker -> category name mapping."""
    categories: dict[str, str] = {}
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
                    category = s.get("category") or s.get("title") or ""
                    if ticker:
                        categories[ticker] = category
                cursor = data.get("cursor")
                series_count = len(data.get("series") or [])
                success = True
                if not cursor or series_count < _PAGE_SIZE:
                    logger.info("Kalshi: loaded %d series categories", len(categories))
                    return categories
                break
            except httpx.HTTPStatusError as exc:
                logger.warning("Kalshi series HTTP %s (attempt %d)", exc.response.status_code, attempt + 1)
                if exc.response.status_code < 500:
                    return categories
            except httpx.HTTPError as exc:
                logger.warning("Kalshi series network error (attempt %d): %s", attempt + 1, exc)
            await asyncio.sleep(backoff)
            backoff *= 2

        if not success:
            logger.warning("Failed to fetch Kalshi series, proceeding without categories")
            return categories

    return categories


def _normalize(raw: dict, series_categories: dict[str, str]) -> NormalizedMarket | None:
    """Convert a raw Kalshi market dict to NormalizedMarket. Returns None if malformed."""
    try:
        ticker = raw.get("ticker")
        if not ticker:
            return None

        title = (raw.get("title") or raw.get("question") or "").strip()
        if not title:
            return None

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
        # Fallback chain: midpoint(no_bid, no_ask) → no_ask alone → 1 - yes_price
        no_ask_raw = raw.get("no_ask", 0)
        no_bid_raw = raw.get("no_bid", 0)

        if no_ask_raw and no_bid_raw:
            no_price = max(0.0, min(1.0, (float(no_ask_raw) + float(no_bid_raw)) / 200.0))
        elif no_ask_raw:
            no_price = max(0.0, min(1.0, float(no_ask_raw) / 100.0))
        else:
            no_price = max(0.0, min(1.0, 1.0 - yes_price))

        # Volume
        volume = float(raw.get("volume") or raw.get("volume_24h") or 0)

        # Category from series mapping
        series_ticker = raw.get("series_ticker") or ""
        category = series_categories.get(series_ticker, "")

        # End date
        end_date = None
        close_raw = raw.get("close_time") or raw.get("expiration_time")
        if close_raw:
            try:
                end_date = datetime.fromisoformat(close_raw.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pass

        # URL — Kalshi API doesn't expose a front-end URL or slug. Use search
        # with order_by=querymatch for best results (per Supreme Leader).
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

    authenticated = bool(settings.KALSHI_API_KEY_ID and settings.KALSHI_API_KEY)
    if authenticated:
        logger.info("Kalshi: using RSA-PSS authenticated requests")
    else:
        logger.info("Kalshi: no API keys configured, using unauthenticated requests")

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        series_categories = await _fetch_series_categories(client)

        markets: list[NormalizedMarket] = []
        expiry_filtered = 0
        low_volume_filtered = 0
        cursor = None

        while True:
            params: dict = {"status": "open", "limit": _PAGE_SIZE}
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
                market = _normalize(raw, series_categories)
                if not market:
                    continue

                # Skip markets with no end date, already expired, or too far out
                if (
                    market.end_date is None
                    or market.end_date <= now
                    or market.end_date > expiry_cutoff
                ):
                    expiry_filtered += 1
                    continue

                # Skip low-volume markets
                if market.volume < settings.MIN_MATCH_VOLUME:
                    low_volume_filtered += 1
                    continue

                markets.append(market)

            logger.debug("Kalshi: fetched %d markets (cursor=%s)", len(raw_markets), cursor)

            if not cursor or len(raw_markets) < _PAGE_SIZE:
                break  # last page

    logger.info(
        "Kalshi: %d markets kept (expired/too-far: %d, low-volume: %d)",
        len(markets), expiry_filtered, low_volume_filtered,
    )
    return markets


async def ingest_kalshi() -> dict[str, int]:
    """Fetch Kalshi markets and upsert into the database.

    Returns: {"fetched": N, "upserted": N, "errors": N}
    """
    try:
        markets = await fetch_kalshi_markets()
    except Exception as exc:
        logger.error("Kalshi ingestion failed: %s", exc, exc_info=True)
        return {"fetched": 0, "upserted": 0, "errors": 1}

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
    return {"fetched": len(markets), "upserted": upserted, "errors": errors}

