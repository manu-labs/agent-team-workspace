"""Kalshi ingester — fetches markets from the Kalshi API and normalizes
them into the common schema, then upserts into SQLite.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

KALSHI_MARKETS_URL = "https://api.elections.kalshi.com/trade-api/v2/markets"
KALSHI_SERIES_URL = "https://api.elections.kalshi.com/trade-api/v2/series"
PAGE_SIZE = 100
_BACKOFF_BASE = 1.0


async def _fetch_with_retry(
    client: httpx.AsyncClient,
    url: str,
    params: dict,
    label: str = "",
) -> dict | None:
    """GET with exponential backoff. Returns parsed JSON dict or None on failure."""
    backoff = _BACKOFF_BASE
    for attempt in range(3):
        try:
            resp = await client.get(url, params=params)
            if resp.status_code == 429:
                wait = backoff * 4
                logger.warning("Kalshi rate limited (%s) — sleeping %.1fs", label, wait)
                await asyncio.sleep(wait)
                backoff *= 2
                continue
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code < 500:
                logger.warning("Kalshi HTTP %s (%s): %s",
                               exc.response.status_code, label, exc)
                return None
            logger.warning("Kalshi 5xx (attempt %d) %s: %s", attempt + 1, label, exc)
        except httpx.HTTPError as exc:
            logger.warning("Kalshi network error (attempt %d) %s: %s", attempt + 1, label, exc)
        if attempt < 2:
            await asyncio.sleep(backoff)
            backoff *= 2
    return None


async def _fetch_series_map(client: httpx.AsyncClient) -> dict[str, str]:
    """Build a series_ticker → category name mapping from the /series endpoint.

    Paginates until all series are fetched.
    """
    category_map: dict[str, str] = {}
    cursor: str | None = None

    while True:
        params: dict = {"limit": PAGE_SIZE}
        if cursor:
            params["cursor"] = cursor

        data = await _fetch_with_retry(client, KALSHI_SERIES_URL, params, "series")
        if not data:
            break

        for s in data.get("series", []):
            ticker = s.get("ticker")
            category = s.get("category") or s.get("title") or "uncategorized"
            if ticker:
                category_map[ticker] = category

        cursor = data.get("cursor") or None
        if not cursor:
            break

    logger.info("Kalshi: built category map with %d series", len(category_map))
    return category_map


async def _fetch_all_markets(
    client: httpx.AsyncClient,
) -> list[dict]:
    """Cursor-paginate through all open Kalshi markets."""
    markets: list[dict] = []
    cursor: str | None = None

    while True:
        params: dict = {"status": "open", "limit": PAGE_SIZE}
        if cursor:
            params["cursor"] = cursor

        data = await _fetch_with_retry(
            client, KALSHI_MARKETS_URL, params, f"markets cursor={cursor or 'start'}"
        )
        if not data:
            break

        page = data.get("markets", [])
        markets.extend(page)
        logger.debug("Kalshi: fetched %d markets (cursor=%s)", len(page), cursor or "start")

        cursor = data.get("cursor") or None
        if not cursor or not page:
            break

    return markets


def _normalize_price(cents: int | float | None) -> float:
    """Convert Kalshi price in cents (0-100) to probability (0.0-1.0)."""
    if cents is None:
        return 0.5
    return round(float(cents) / 100.0, 4)


def _normalize(market: dict, category_map: dict[str, str]) -> dict | None:
    """Normalize a raw Kalshi market dict to our common schema dict."""
    try:
        ticker = market.get("ticker")
        title = market.get("title") or ""
        if not ticker or not title:
            return None

        yes_price = _normalize_price(market.get("yes_ask"))
        no_price = _normalize_price(market.get("no_ask"))
        volume = float(market.get("volume") or market.get("volume_24h") or 0)
        close_time = market.get("close_time") or market.get("expiration_time")

        # Look up category: prefer series_ticker, fall back to event_ticker
        series_ticker = market.get("series_ticker")
        event_ticker = market.get("event_ticker")
        category = (
            category_map.get(series_ticker)
            or category_map.get(event_ticker)
            or "uncategorized"
        )

        url = f"https://kalshi.com/markets/{ticker}"

        return {
            "id": f"kalshi_{ticker}",
            "platform": "kalshi",
            "question": title,
            "category": category,
            "yes_price": yes_price,
            "no_price": no_price,
            "volume": volume,
            "end_date": close_time,
            "url": url,
            "raw_data": json.dumps({
                "ticker": ticker,
                "series_ticker": series_ticker,
                "event_ticker": event_ticker,
            }),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
    except (KeyError, TypeError, ValueError) as exc:
        logger.warning("Skipping malformed Kalshi market: %s", exc)
        return None


async def fetch_and_upsert(db) -> dict[str, int]:
    """Fetch all open Kalshi markets and upsert into the markets table.

    Fetches series first for category enrichment, then paginates markets.
    Returns: {"fetched": N, "new": N, "updated": N, "skipped": N}
    """
    async with httpx.AsyncClient(
        timeout=30,
        headers={"User-Agent": "ArbScanner/1.0"},
        follow_redirects=True,
    ) as client:
        # Fetch series map and markets in parallel
        category_map, raw_markets = await asyncio.gather(
            _fetch_series_map(client),
            _fetch_all_markets(client),
        )

    logger.info("Kalshi: fetched %d raw markets", len(raw_markets))

    new_count = updated_count = skipped_count = 0

    for raw in raw_markets:
        normalized = _normalize(raw, category_map)
        if normalized is None:
            skipped_count += 1
            continue

        try:
            cursor = await db.execute(
                "SELECT id FROM markets WHERE id = ?", [normalized["id"]]
            )
            existing = await cursor.fetchone()

            if existing is None:
                await db.execute(
                    """INSERT INTO markets
                       (id, platform, question, category, yes_price, no_price,
                        volume, end_date, url, raw_data, last_updated)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    [
                        normalized["id"], normalized["platform"],
                        normalized["question"], normalized["category"],
                        normalized["yes_price"], normalized["no_price"],
                        normalized["volume"], normalized["end_date"],
                        normalized["url"], normalized["raw_data"],
                        normalized["last_updated"],
                    ],
                )
                new_count += 1
            else:
                await db.execute(
                    """UPDATE markets SET
                       question=?, category=?, yes_price=?, no_price=?,
                       volume=?, end_date=?, url=?, raw_data=?, last_updated=?
                       WHERE id=?""",
                    [
                        normalized["question"], normalized["category"],
                        normalized["yes_price"], normalized["no_price"],
                        normalized["volume"], normalized["end_date"],
                        normalized["url"], normalized["raw_data"],
                        normalized["last_updated"], normalized["id"],
                    ],
                )
                updated_count += 1

        except Exception as exc:
            logger.error("Error upserting Kalshi market %s: %s",
                         normalized.get("id"), exc, exc_info=True)
            skipped_count += 1

    await db.commit()
    logger.info(
        "Kalshi upsert done — new: %d, updated: %d, skipped: %d",
        new_count, updated_count, skipped_count,
    )
    return {
        "fetched": len(raw_markets),
        "new": new_count,
        "updated": updated_count,
        "skipped": skipped_count,
    }