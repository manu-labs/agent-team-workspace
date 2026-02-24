"""Fast price refresh — fetches current prices for matched markets only.

Called by the price_refresh_loop in poller.py every PRICE_REFRESH_INTERVAL_SECONDS.
Only touches the top matches by volume, not all matches in the DB.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone

import httpx

from app.services.calculator import calculate_spread

logger = logging.getLogger(__name__)

KALSHI_MARKET_URL = "https://api.elections.kalshi.com/trade-api/v2/markets/{ticker}"
POLY_MARKET_URL = "https://gamma-api.polymarket.com/markets/{market_id}"

# Limit concurrent API requests to avoid rate limiting
_MAX_CONCURRENT = 10
_TIMEOUT = 10
# Only refresh the top N matches by volume to stay within API rate limits.
# With 200 matches: ~400 API calls per cycle, well within platform limits.
_MAX_MATCHES_TO_REFRESH = 200


async def refresh_prices(db) -> dict:
    """Fetch current prices for top matched markets and update spreads.

    Returns: {"matches_refreshed": N, "errors": N, "elapsed_seconds": N}
    """
    started = datetime.now(timezone.utc)

    # 1. Get top matched market pairs by volume (capped to avoid rate limiting)
    cursor = await db.execute(
        """SELECT id, polymarket_id, kalshi_id FROM matches
           ORDER BY MIN(polymarket_volume, kalshi_volume) DESC
           LIMIT ?""",
        [_MAX_MATCHES_TO_REFRESH],
    )
    matches = [dict(r) for r in await cursor.fetchall()]

    if not matches:
        return {"matches_refreshed": 0, "errors": 0, "elapsed_seconds": 0}

    # 2. Collect unique market IDs to fetch
    poly_ids = set()
    kalshi_ids = set()
    for m in matches:
        poly_ids.add(m["polymarket_id"])   # format: "polymarket:12345"
        kalshi_ids.add(m["kalshi_id"])     # format: "kalshi:KXTICKER"

    # 3. Fetch all prices concurrently with semaphore
    semaphore = asyncio.Semaphore(_MAX_CONCURRENT)
    prices: dict = {}  # market_id -> {"yes_price": float, "no_price": float, "volume": float}

    async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
        tasks = []
        for pid in poly_ids:
            tasks.append(_fetch_poly_price(client, semaphore, pid, prices))
        for kid in kalshi_ids:
            tasks.append(_fetch_kalshi_price(client, semaphore, kid, prices))

        results = await asyncio.gather(*tasks, return_exceptions=True)
        errors = sum(1 for r in results if isinstance(r, Exception) or r is False)

    # 4. Update markets table + recalculate spreads + record snapshots
    now = datetime.now(timezone.utc).isoformat()
    refreshed = 0

    for match in matches:
        poly_price = prices.get(match["polymarket_id"])
        kalshi_price = prices.get(match["kalshi_id"])

        if not poly_price or not kalshi_price:
            continue

        # Update markets table with fresh prices
        for market_id, price_data in [
            (match["polymarket_id"], poly_price),
            (match["kalshi_id"], kalshi_price),
        ]:
            await db.execute(
                """UPDATE markets SET yes_price = ?, no_price = ?, volume = ?,
                   last_updated = ? WHERE id = ?""",
                (price_data["yes_price"], price_data["no_price"],
                 price_data["volume"], now, market_id),
            )

        # Recalculate spread
        sd = calculate_spread(poly_price["yes_price"], kalshi_price["yes_price"])

        await db.execute(
            """UPDATE matches SET
                spread = ?, fee_adjusted_spread = ?,
                polymarket_yes = ?, kalshi_yes = ?,
                polymarket_volume = ?, kalshi_volume = ?,
                last_updated = ?
               WHERE id = ?""",
            (sd["raw_spread"], sd["fee_adjusted_spread"],
             poly_price["yes_price"], kalshi_price["yes_price"],
             poly_price["volume"], kalshi_price["volume"],
             now, match["id"]),
        )

        # Record snapshot
        await db.execute(
            """INSERT INTO price_history
               (match_id, polymarket_yes, kalshi_yes, spread,
                fee_adjusted_spread, recorded_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (match["id"], poly_price["yes_price"], kalshi_price["yes_price"],
             sd["raw_spread"], sd["fee_adjusted_spread"], now),
        )
        refreshed += 1

    await db.commit()
    elapsed = (datetime.now(timezone.utc) - started).total_seconds()

    logger.info(
        "Price refresh: %d/%d matches updated, %d errors, %.1fs",
        refreshed, len(matches), errors, elapsed,
    )
    return {
        "matches_refreshed": refreshed,
        "errors": errors,
        "elapsed_seconds": round(elapsed, 2),
    }


async def _fetch_poly_price(client, semaphore, market_id: str, prices: dict) -> bool:
    """Fetch current price for a single Polymarket market.

    market_id format: "polymarket:12345"
    API: GET https://gamma-api.polymarket.com/markets/{numeric_id}
    """
    async with semaphore:
        numeric_id = market_id.split(":", 1)[1]  # strip "polymarket:" prefix
        try:
            resp = await client.get(POLY_MARKET_URL.format(market_id=numeric_id))
            resp.raise_for_status()
            data = resp.json()

            prices_raw = data.get("outcomePrices")
            if isinstance(prices_raw, str):
                outcome_prices = json.loads(prices_raw)
            elif isinstance(prices_raw, list):
                outcome_prices = prices_raw
            else:
                return False

            if len(outcome_prices) < 2:
                return False

            # Check if outcomes[0] is "No" and swap prices — same fix as polymarket.py (PR #246)
            outcomes = data.get("outcomes") or []
            if isinstance(outcomes, str):
                try:
                    outcomes = json.loads(outcomes)
                except json.JSONDecodeError:
                    outcomes = []
            if len(outcomes) >= 2 and str(outcomes[0]).strip().lower() == "no":
                outcome_prices = [outcome_prices[1], outcome_prices[0]]

            prices[market_id] = {
                "yes_price": float(outcome_prices[0]),
                "no_price": float(outcome_prices[1]),
                "volume": float(data.get("volumeNum") or data.get("volume") or 0),
            }
            return True
        except Exception as exc:
            logger.debug("Failed to fetch Polymarket %s: %s", numeric_id, exc)
            return False


async def _fetch_kalshi_price(client, semaphore, market_id: str, prices: dict) -> bool:
    """Fetch current price for a single Kalshi market.

    market_id format: "kalshi:KXTICKER-NAME"
    API: GET https://api.elections.kalshi.com/trade-api/v2/markets/{ticker}

    Uses last_price as primary (consistent with kalshi.py normalizer fix in #243):
    Fallback chain: last_price → midpoint(yes_bid, yes_ask) → yes_ask alone
    """
    async with semaphore:
        ticker = market_id.split(":", 1)[1]  # strip "kalshi:" prefix
        try:
            resp = await client.get(KALSHI_MARKET_URL.format(ticker=ticker))
            resp.raise_for_status()
            data = resp.json().get("market", {})

            last_price_raw = data.get("last_price", 0)
            yes_ask_raw = data.get("yes_ask", 0)
            yes_bid_raw = data.get("yes_bid", 0)

            if last_price_raw and last_price_raw > 0:
                yes_price = max(0.0, min(1.0, float(last_price_raw) / 100.0))
            elif yes_ask_raw and yes_bid_raw:
                yes_price = max(0.0, min(1.0, (float(yes_ask_raw) + float(yes_bid_raw)) / 200.0))
            else:
                yes_price = max(0.0, min(1.0, float(yes_ask_raw or 0) / 100.0))

            no_price = max(0.0, min(1.0, 1.0 - yes_price))

            prices[market_id] = {
                "yes_price": yes_price,
                "no_price": no_price,
                "volume": float(data.get("volume") or 0),
            }
            return True
        except Exception as exc:
            logger.debug("Failed to fetch Kalshi %s: %s", ticker, exc)
            return False
