"""WebSocket manager — orchestrates Polymarket and Kalshi WS clients.

Responsibilities:
  - Lifecycle: start/stop both clients
  - Token/ticker → market ID mapping (in-memory, rebuilt from DB on startup)
  - Subscription sync: subscribe new matches, unsubscribe removed matches
  - Price update callbacks: update markets table, recalculate match spreads,
    record price_history snapshots

Called from:
  - main.py lifespan (start/stop)
  - poller._run_cycle() after match step (sync_subscriptions)
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.database import get_db
from app.services.calculator import calculate_spread
from app.services.ws_kalshi import KalshiWSClient
from app.services.ws_polymarket import PolymarketWSClient

logger = logging.getLogger(__name__)

# In-memory token/ticker → market_id maps
# Poly:   clob_token_id  → "polymarket:UUID"
# Kalshi: market_ticker  → "kalshi:TICKER"
_poly_token_to_market: dict[str, str] = {}
_kalshi_ticker_to_market: dict[str, str] = {}

_poly_client: PolymarketWSClient | None = None
_kalshi_client: KalshiWSClient | None = None


async def start() -> None:
    """Start both WS clients and subscribe to all active matches from the DB."""
    global _poly_client, _kalshi_client

    _poly_client = PolymarketWSClient(on_price_update=_on_poly_price)
    _kalshi_client = KalshiWSClient(on_price_update=_on_kalshi_price)

    await _poly_client.start()
    await _kalshi_client.start()

    # Brief delay to let connections establish before syncing subscriptions
    await asyncio.sleep(2)
    await sync_subscriptions()

    logger.info("WebSocket manager started")


async def stop() -> None:
    """Stop both WS clients."""
    if _poly_client:
        await _poly_client.stop()
    if _kalshi_client:
        await _kalshi_client.stop()
    logger.info("WebSocket manager stopped")


def is_connected() -> bool:
    """Return True if at least one WS connection is active (partial data)."""
    poly_ok = _poly_client is not None and _poly_client.connected
    kalshi_ok = _kalshi_client is not None and _kalshi_client.connected
    return poly_ok or kalshi_ok


def both_connected() -> bool:
    """Return True if BOTH WS connections are active (full real-time coverage)."""
    poly_ok = _poly_client is not None and _poly_client.connected
    kalshi_ok = _kalshi_client is not None and _kalshi_client.connected
    return poly_ok and kalshi_ok


def get_ws_status() -> dict:
    """Return WS connection state for the /poll/status endpoint."""
    return {
        "polymarket_connected": _poly_client is not None and _poly_client.connected,
        "kalshi_connected": _kalshi_client is not None and _kalshi_client.connected,
        "subscribed_poly_tokens": len(_poly_token_to_market),
        "subscribed_kalshi_tickers": len(_kalshi_ticker_to_market),
    }


async def sync_subscriptions() -> None:
    """Sync WS subscriptions with the current active matches in the DB.

    Subscribes to tokens/tickers for new matches, unsubscribes from ones that
    were removed (e.g. by diff cleanup). Called after each discovery cycle
    and on startup so subscriptions always reflect the current match set.
    """
    db = await get_db()

    # Query all active match market IDs
    cursor = await db.execute("SELECT polymarket_id, kalshi_id FROM matches")
    active_matches = [dict(r) for r in await cursor.fetchall()]

    # Build desired token/ticker → market_id maps from DB
    desired_poly: dict[str, str] = {}    # clob_token_id → poly market_id
    desired_kalshi: dict[str, str] = {}  # ticker → kalshi market_id

    if active_matches:
        poly_market_ids = list({m["polymarket_id"] for m in active_matches})
        ph = ",".join("?" * len(poly_market_ids))
        cursor = await db.execute(
            f"SELECT id, clob_token_ids FROM markets WHERE id IN ({ph}) AND clob_token_ids != ''",
            poly_market_ids,
        )
        for row in await cursor.fetchall():
            desired_poly[row["clob_token_ids"]] = row["id"]

        for m in active_matches:
            # Kalshi market_id format: "kalshi:TICKER" — strip prefix for WS subscribe
            ticker = m["kalshi_id"].split(":", 1)[1]
            desired_kalshi[ticker] = m["kalshi_id"]

    # Diff against current subscriptions
    new_poly = [t for t in desired_poly if t not in _poly_token_to_market]
    new_kalshi = [t for t in desired_kalshi if t not in _kalshi_ticker_to_market]
    removed_poly = [t for t in _poly_token_to_market if t not in desired_poly]
    removed_kalshi = [t for t in _kalshi_ticker_to_market if t not in desired_kalshi]

    # Update in-memory maps
    _poly_token_to_market.update(desired_poly)
    _kalshi_ticker_to_market.update(desired_kalshi)
    for t in removed_poly:
        _poly_token_to_market.pop(t, None)
    for t in removed_kalshi:
        _kalshi_ticker_to_market.pop(t, None)

    # Push subscribe/unsubscribe commands to WS clients
    if _poly_client:
        if new_poly:
            await _poly_client.subscribe(new_poly)
        if removed_poly:
            await _poly_client.unsubscribe(removed_poly)

    if _kalshi_client:
        if new_kalshi:
            await _kalshi_client.subscribe(new_kalshi)
        if removed_kalshi:
            await _kalshi_client.unsubscribe(removed_kalshi)

    logger.info(
        "WS sync — poly: +%d/-%d (%d total), kalshi: +%d/-%d (%d total)",
        len(new_poly), len(removed_poly), len(_poly_token_to_market),
        len(new_kalshi), len(removed_kalshi), len(_kalshi_ticker_to_market),
    )


# ---------------------------------------------------------------------------
# Price update callbacks
# ---------------------------------------------------------------------------

async def _on_poly_price(token_id: str, yes_price: float, no_price: float, volume: float) -> None:
    """Handle a Polymarket price event — look up market ID and update DB."""
    market_id = _poly_token_to_market.get(token_id)
    if not market_id:
        return
    await _update_market_and_matches(market_id, yes_price, no_price, volume)


async def _on_kalshi_price(ticker: str, yes_price: float, no_price: float, volume: float) -> None:
    """Handle a Kalshi ticker event — look up market ID and update DB."""
    market_id = _kalshi_ticker_to_market.get(ticker)
    if not market_id:
        return
    await _update_market_and_matches(market_id, yes_price, no_price, volume)


async def _update_market_and_matches(
    market_id: str, yes_price: float, no_price: float, volume: float
) -> None:
    """Update market row in DB and recalculate spreads for all affected matches.

    FK-safe write order:
      1. UPDATE markets (prices, last_updated)
      2. UPDATE matches (spread, prices, volumes, last_updated)
      3. INSERT price_history snapshot
    """
    try:
        db = await get_db()
        now = datetime.now(timezone.utc).isoformat()

        # 1. Update market prices
        await db.execute(
            "UPDATE markets SET yes_price = ?, no_price = ?, volume = ?, last_updated = ? WHERE id = ?",
            (yes_price, no_price, volume, now, market_id),
        )

        # 2. Find all matches involving this market and recalculate spreads
        cursor = await db.execute(
            """SELECT
                m.id,
                pm.yes_price AS poly_yes,
                km.yes_price AS kalshi_yes,
                pm.volume    AS poly_vol,
                km.volume    AS kalshi_vol
               FROM matches m
               LEFT JOIN markets pm ON m.polymarket_id = pm.id
               LEFT JOIN markets km ON m.kalshi_id = km.id
               WHERE m.polymarket_id = ? OR m.kalshi_id = ?""",
            [market_id, market_id],
        )
        affected = [dict(r) for r in await cursor.fetchall()]

        for match in affected:
            poly_yes = match["poly_yes"] or 0.0
            kalshi_yes = match["kalshi_yes"] or 0.0
            if not poly_yes or not kalshi_yes:
                continue

            sd = calculate_spread(poly_yes, kalshi_yes)

            await db.execute(
                """UPDATE matches SET
                    spread = ?, fee_adjusted_spread = ?,
                    polymarket_yes = ?, kalshi_yes = ?,
                    polymarket_volume = ?, kalshi_volume = ?,
                    last_updated = ?
                   WHERE id = ?""",
                (
                    sd["raw_spread"], sd["fee_adjusted_spread"],
                    poly_yes, kalshi_yes,
                    match["poly_vol"] or 0, match["kalshi_vol"] or 0,
                    now, match["id"],
                ),
            )

            # 3. Record price history snapshot
            await db.execute(
                """INSERT INTO price_history
                   (match_id, polymarket_yes, kalshi_yes, spread, fee_adjusted_spread, recorded_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    match["id"], poly_yes, kalshi_yes,
                    sd["raw_spread"], sd["fee_adjusted_spread"], now,
                ),
            )

        await db.commit()

    except Exception as exc:
        logger.error("WS price update failed for %s: %s", market_id, exc, exc_info=True)
