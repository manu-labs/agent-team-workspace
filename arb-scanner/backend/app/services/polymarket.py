"""Polymarket ingester — fetches active markets from the Gamma API."""

import asyncio
import json
import logging
import re
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

# Skip game/map/set-level sub-markets — Kalshi only has series-level contracts,
# so these can never produce valid cross-platform matches.
# Matches: "Game 1 Winner", "Map 2 Winner", "Set 3 Winner", "Round 1 Winner", etc.
_GAME_LEVEL_RE = re.compile(r"^(Game|Map|Set|Round)\s+\d+", re.IGNORECASE)


def _normalize(raw: dict) -> NormalizedMarket | None:
    """Convert a raw Gamma API market dict to NormalizedMarket. Returns None if malformed."""
    try:
        market_id = raw.get("id") or raw.get("conditionId")
        if not market_id:
            return None

        question = (raw.get("question") or "").strip()
        if not question:
            return None

        # Skip game-level sub-markets (Game 1, Map 2, Set 3, etc.)
        # These are sub-events in esports/sports that Kalshi doesn't have.
        group_title = (raw.get("groupItemTitle") or "").strip()
        if group_title and _GAME_LEVEL_RE.match(group_title):
            logger.debug(
                "Polymarket %s: skipping game-level sub-market (groupItemTitle=%s)",
                market_id, group_title,
            )
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
        outcomes: list = []
        if outcomes_raw:
            if isinstance(outcomes_raw, str):
                try:
                    outcomes = json.loads(outcomes_raw)
                except json.JSONDecodeError:
                    outcomes = []
            elif isinstance(outcomes_raw, list):
                outcomes = outcomes_raw

        first_outcome_is_no = (
            len(outcomes) >= 2 and str(outcomes[0]).strip().lower() == "no"
        )
        if first_outcome_is_no:
            logger.debug(
                "Polymarket %s: outcomes[0]='%s', swapping yes/no prices",
                market_id, outcomes[0],
            )
            yes_price, no_price = no_price, yes_price

        # Extract CLOB token ID for real-time WebSocket subscriptions.
        # clobTokenIds is a JSON string of two token IDs: [YES_TOKEN, NO_TOKEN].
        # When outcomes[0] is "No" (prices were swapped), the YES token is index 1.
        clob_token_ids_raw = raw.get("clobTokenIds")
        clob_token_id = ""
        if clob_token_ids_raw:
            try:
                clob_tokens = (
                    json.loads(clob_token_ids_raw)
                    if isinstance(clob_token_ids_raw, str)
                    else clob_token_ids_raw
                )
                if isinstance(clob_tokens, list) and len(clob_tokens) >= 2:
                    # YES token is index 1 if outcomes were swapped, else index 0
                    clob_token_id = str(clob_tokens[1] if first_outcome_is_no else clob_tokens[0])
            except (json.JSONDecodeError, IndexError):
                pass

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

        # Build enriched embedding text — includes groupItemTitle to distinguish
        # game-level sub-markets (e.g. "Game 1 Winner") from series-level
        # markets ("Match Winner") in esports events.
        description = ((raw.get("description") or "")[:300]).strip()
        parts = [question]
        if group_title:
            parts.append(f"Market type: {group_title}")
        if description:
            parts.append(description)
        embed_text = ". ".join(parts)

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
            embed_text=embed_text,
            clob_token_ids=clob_token_id,
            raw_data=raw,
            last_updated=datetime.now(timezone.utc),
        )
    except Exception as exc:
        logger.warning("Failed to normalize Polymarket market %s: %s", raw.get("id"), exc)
        return None


async def _fetch_page(
    client: httpx.AsyncClient,
    offset: int,
    end_date_min: str,
    end_date_max: str,
) -> list[dict]:
    """Fetch a single page from the Gamma API with retry/backoff."""
    params = {
        "active": "true",
        "closed": "false",
        "archived": "false",
        "end_date_min": end_date_min,
        "end_date_max": end_date_max,
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
    """Fetch active Polymarket markets via server-side date filter + MIN_MATCH_VOLUME."""
    markets: list[NormalizedMarket] = []
    low_volume_filtered = 0
    offset = 0

    now = datetime.now(timezone.utc)
    expiry_cutoff = now + timedelta(days=settings.MATCH_EXPIRY_DAYS)

    # ISO 8601 format for Gamma API end_date_min/end_date_max params
    end_date_min = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    end_date_max = expiry_cutoff.strftime("%Y-%m-%dT%H:%M:%SZ")

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        while True:
            raw_markets = await _fetch_page(client, offset, end_date_min, end_date_max)
            if not raw_markets:
                break

            for raw in raw_markets:
                market = _normalize(raw)
                if not market:
                    continue

                # Skip low-volume markets (expiry filtering is done server-side)
                if market.volume < settings.MIN_MATCH_VOLUME:
                    low_volume_filtered += 1
                    continue

                markets.append(market)

            logger.debug("Polymarket: fetched %d markets at offset=%d", len(raw_markets), offset)

            if len(raw_markets) < _PAGE_SIZE:
                break  # last page
            offset += _PAGE_SIZE

    logger.info(
        "Polymarket: %d markets kept (low-volume filtered: %d)",
        len(markets), low_volume_filtered,
    )
    return markets


async def ingest_polymarket() -> dict:
    """Fetch Polymarket markets and upsert into the database.

    Returns: {"fetched": N, "upserted": N, "errors": N, "market_ids": [...]}
    """
    try:
        markets = await fetch_polymarket_markets()
    except Exception as exc:
        logger.error("Polymarket ingestion failed: %s", exc, exc_info=True)
        return {"fetched": 0, "upserted": 0, "errors": 1, "market_ids": []}

    db = await get_db()
    upserted = 0
    errors = 0

    for m in markets:
        try:
            await db.execute(
                """
                INSERT INTO markets (id, platform, question, category, yes_price, no_price,
                                     volume, end_date, url, raw_data, last_updated,
                                     embed_text, clob_token_ids)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    question       = excluded.question,
                    category       = excluded.category,
                    yes_price      = excluded.yes_price,
                    no_price       = excluded.no_price,
                    volume         = excluded.volume,
                    end_date       = excluded.end_date,
                    url            = excluded.url,
                    raw_data       = excluded.raw_data,
                    last_updated   = excluded.last_updated,
                    embed_text     = excluded.embed_text,
                    clob_token_ids = excluded.clob_token_ids
                """,
                (
                    m.id, m.platform, m.question, m.category,
                    m.yes_price, m.no_price, m.volume,
                    m.end_date.isoformat() if m.end_date else None,
                    m.url, '{}', m.last_updated.isoformat(),
                    m.embed_text, m.clob_token_ids,
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
    return {"fetched": len(markets), "upserted": upserted, "errors": errors, "market_ids": [m.id for m in markets]}
