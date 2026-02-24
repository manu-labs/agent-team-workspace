"""Polymarket ingester — fetches active markets from the Gamma API."""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

import httpx

from app.config import settings
from app.database import get_db
from app.models.market import NormalizedMarket

logger = logging.getLogger(__name__)

GAMMA_API_URL = "https://gamma-api.polymarket.com/markets"
_PAGE_SIZE = 100
_RETRIES = 3
_PLATFORM = "polymarket"


def _normalize(raw: dict) -> NormalizedMarket | None:
    """Convert a raw Gamma API market dict to NormalizedMarket. Returns None if malformed."""
    try:
        market_id = raw.get("id") or raw.get("conditionId")
        if not market_id:
            return None

        question = (raw.get("question") or "").strip()
        if not question:
            return None

        # outcomePrices is a JSON string: "[0.65, 0.35]"
        prices_raw = raw.get("outcomePrices")
        if isinstance(prices_raw, str):
            prices = json.loads(prices_raw)
        elif isinstance(prices_raw, list):
            prices = prices_raw
        else:
            prices = []

        if len(prices) < 2:
            return None

        yes_price = float(prices[0])
        no_price = float(prices[1])

        # Validate outcomes field — ensure outcomePrices[0] corresponds to "Yes"
        # The Gamma API returns outcomes as a JSON string: '["Yes", "No"]'
        # If the first outcome is "No", swap prices so yes_price always = YES
        outcomes_raw = raw.get("outcomes")
        if outcomes_raw:
            if isinstance(outcomes_raw, str):
                try:
                    outcomes = json.loads(outcomes_raw)
                except json.JSONDecodeError:
                    outcomes = []
            elif isinstance(outcomes_raw, list):
                outcomes = outcomes_raw
            else:
                outcomes = []

            if len(outcomes) >= 2 and str(outcomes[0]).strip().lower() == "no":
                logger.debug(
                    "Polymarket %s: outcomes[0]='%s', swapping yes/no prices",
                    market_id, outcomes[0],
                )
                yes_price, no_price = no_price, yes_price

        # Extract category from tags list
        tags = raw.get("tags") or []
        category = ""
        if tags:
            first_tag = tags[0]
            if isinstance(first_tag, dict):
                category = first_tag.get("label") or first_tag.get("name") or ""
            elif isinstance(first_tag, str):
                category = first_tag

        # Volume — can be string or float
        volume = float(raw.get("volume") or raw.get("volumeNum") or 0)

        # End date
        end_date_raw = raw.get("endDate") or raw.get("end_date_iso")
        end_date = None
        if end_date_raw:
            try:
                end_date = datetime.fromisoformat(end_date_raw.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pass

        # URL — use event slug (not market slug) for correct Polymarket links
        events = raw.get("events") or []
        event_slug = events[0].get("slug", "") if events else ""
        slug = event_slug or raw.get("slug") or ""
        url = f"https://polymarket.com/event/{slug}" if slug else ""

        return NormalizedMarket(
            id=f"{_PLATFORM}:{market_id}",
            platform=_PLATFORM,
            question=question,
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
        logger.warning("Failed to normalize Polymarket market %s: %s", raw.get("id"), exc)
        return None


async def _fetch_page(client: httpx.AsyncClient, offset: int) -> list[dict]:
    """Fetch a single page from the Gamma API with retry/backoff."""
    params = {
        "active": "true",
        "closed": "false",
        "archived": "false",
        "offset": offset,
        "limit": _PAGE_SIZE,
    }
    backoff = 1.0

    for attempt in range(_RETRIES):
        try:
            resp = await client.get(GAMMA_API_URL, params=params)
            if resp.status_code == 429:
                wait = backoff * 3
                logger.warning("Polymarket rate-limited, backing off %.0fs", wait)
                await asyncio.sleep(wait)
                backoff *= 2
                continue
            resp.raise_for_status()
            page = resp.json()
            if isinstance(page, list):
                return page
            return page.get("markets") or page.get("data") or []
        except httpx.HTTPStatusError as exc:
            logger.warning("Polymarket HTTP %s (attempt %d)", exc.response.status_code, attempt + 1)
            if exc.response.status_code < 500:
                break
        except httpx.HTTPError as exc:
            logger.warning("Polymarket network error (attempt %d): %s", attempt + 1, exc)

        await asyncio.sleep(backoff)
        backoff *= 2

    return []


async def fetch_polymarket_markets() -> list[NormalizedMarket]:
    """Fetch active Polymarket markets expiring within MATCH_EXPIRY_DAYS with MIN_MATCH_VOLUME."""
    markets: list[NormalizedMarket] = []
    expiry_filtered = 0
    low_volume_filtered = 0
    offset = 0

    now = datetime.now(timezone.utc)
    expiry_cutoff = now + timedelta(days=settings.MATCH_EXPIRY_DAYS)

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        while True:
            raw_markets = await _fetch_page(client, offset)
            if not raw_markets:
                break

            for raw in raw_markets:
                market = _normalize(raw)
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

            logger.debug("Polymarket: fetched %d markets at offset=%d", len(raw_markets), offset)

            if len(raw_markets) < _PAGE_SIZE:
                break  # last page
            offset += _PAGE_SIZE

    logger.info(
        "Polymarket: %d markets kept (expired/too-far: %d, low-volume: %d)",
        len(markets), expiry_filtered, low_volume_filtered,
    )
    return markets


async def ingest_polymarket() -> dict[str, int]:
    """Fetch Polymarket markets and upsert into the database.

    Returns: {"fetched": N, "upserted": N, "errors": N}
    """
    try:
        markets = await fetch_polymarket_markets()
    except Exception as exc:
        logger.error("Polymarket ingestion failed: %s", exc, exc_info=True)
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
            logger.error("Failed to upsert Polymarket market %s: %s", m.id, exc)
            errors += 1

    await db.commit()
    logger.info(
        "Polymarket ingest complete — fetched: %d, upserted: %d, errors: %d",
        len(markets), upserted, errors,
    )
    return {"fetched": len(markets), "upserted": upserted, "errors": errors}
