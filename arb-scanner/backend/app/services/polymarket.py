"""Polymarket ingester — fetches markets from the Gamma API and normalizes
them into the common schema, then upserts into SQLite.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

GAMMA_API_URL = "https://gamma-api.polymarket.com/markets"
PAGE_SIZE = 100
_BACKOFF_BASE = 1.0


def _parse_outcome_prices(raw: str | None) -> tuple[float, float]:
    """Parse outcomePrices JSON string '[\"0.65\", \"0.35\"]' → (yes, no)."""
    try:
        prices = json.loads(raw or "[]")
        yes = float(prices[0]) if len(prices) > 0 else 0.5
        no = float(prices[1]) if len(prices) > 1 else round(1 - yes, 4)
        return yes, no
    except (ValueError, TypeError, IndexError):
        return 0.5, 0.5


def _extract_category(market: dict) -> str:
    """Best-effort category from events → series title, event title, or 'uncategorized'."""
    events = market.get("events") or []
    if events:
        event = events[0]
        series_list = event.get("series") or []
        if series_list and series_list[0].get("title"):
            return series_list[0]["title"]
        if event.get("title"):
            return event["title"]
    return "uncategorized"


def _market_url(market: dict) -> str:
    events = market.get("events") or []
    if events and events[0].get("slug"):
        return f"https://polymarket.com/event/{events[0]['slug']}"
    slug = market.get("slug")
    if slug:
        return f"https://polymarket.com/market/{slug}"
    return ""


async def _fetch_page(client: httpx.AsyncClient, offset: int) -> list[dict]:
    """Fetch a single page of markets with retries."""
    params = {
        "active": "true",
        "closed": "false",
        "limit": PAGE_SIZE,
        "offset": offset,
    }
    backoff = _BACKOFF_BASE
    for attempt in range(3):
        try:
            resp = await client.get(GAMMA_API_URL, params=params)
            if resp.status_code == 429:
                wait = backoff * 4
                logger.warning("Polymarket rate limited — sleeping %.1fs", wait)
                await asyncio.sleep(wait)
                backoff *= 2
                continue
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else []
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code < 500:
                logger.warning("Polymarket HTTP %s at offset %d — skipping page",
                               exc.response.status_code, offset)
                return []
            logger.warning("Polymarket 5xx (attempt %d) at offset %d: %s",
                           attempt + 1, offset, exc)
        except httpx.HTTPError as exc:
            logger.warning("Polymarket network error (attempt %d) at offset %d: %s",
                           attempt + 1, offset, exc)
        if attempt < 2:
            await asyncio.sleep(backoff)
            backoff *= 2
    return []


async def _fetch_all_markets() -> list[dict]:
    """Paginate through all active Polymarket markets."""
    markets: list[dict] = []
    async with httpx.AsyncClient(
        timeout=30,
        headers={"User-Agent": "ArbScanner/1.0"},
        follow_redirects=True,
    ) as client:
        offset = 0
        while True:
            page = await _fetch_page(client, offset)
            if not page:
                break
            markets.extend(page)
            logger.debug("Polymarket: fetched %d markets (offset=%d)", len(page), offset)
            if len(page) < PAGE_SIZE:
                break
            offset += PAGE_SIZE
    return markets


def _normalize(market: dict) -> dict | None:
    """Normalize a raw Gamma API market dict to our common schema dict."""
    try:
        market_id = str(market["id"])
        question = market.get("question") or ""
        if not question:
            return None

        yes_price, no_price = _parse_outcome_prices(market.get("outcomePrices"))
        volume = float(market.get("volume") or 0)
        end_date = market.get("endDateIso") or market.get("endDate")
        category = _extract_category(market)
        url = _market_url(market)

        return {
            "id": f"polymarket_{market_id}",
            "platform": "polymarket",
            "question": question,
            "category": category,
            "yes_price": yes_price,
            "no_price": no_price,
            "volume": volume,
            "end_date": end_date,
            "url": url,
            "raw_data": json.dumps({"id": market_id, "slug": market.get("slug")}),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
    except (KeyError, TypeError, ValueError) as exc:
        logger.warning("Skipping malformed Polymarket market: %s", exc)
        return None


async def fetch_and_upsert(db) -> dict[str, int]:
    """Fetch all active Polymarket markets and upsert into the markets table.

    Returns: {"fetched": N, "new": N, "updated": N, "skipped": N}
    """
    raw_markets = await _fetch_all_markets()
    logger.info("Polymarket: fetched %d raw markets", len(raw_markets))

    new_count = updated_count = skipped_count = 0

    for raw in raw_markets:
        normalized = _normalize(raw)
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
            logger.error("Error upserting Polymarket market %s: %s",
                         normalized.get("id"), exc, exc_info=True)
            skipped_count += 1

    await db.commit()
    logger.info(
        "Polymarket upsert done — new: %d, updated: %d, skipped: %d",
        new_count, updated_count, skipped_count,
    )
    return {
        "fetched": len(raw_markets),
        "new": new_count,
        "updated": updated_count,
        "skipped": skipped_count,
    }