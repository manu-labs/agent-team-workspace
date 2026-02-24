"""WebSocket manager — orchestrates Polymarket and Kalshi WS clients.

Responsibilities:
  - Lifecycle: start/stop both clients
  - Token/ticker → market ID mapping (in-memory, rebuilt from DB on startup)
  - Subscription sync: subscribe new matches, unsubscribe removed matches
  - Price update callbacks: update markets table, recalculate match spreads,
    record throttled price_history snapshots
  - Broadcast callbacks: push price updates to registered consumers
    (e.g. the client-facing /ws endpoint)

Called from:
  - main.py lifespan (start/stop)
  - poller._run_cycle() after match step (sync_subscriptions)
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Awaitable, Callable

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

# Serialise all DB writes from WS callbacks — aiosqlite uses a single connection
# so concurrent writes from both WS clients can cause "database is locked" errors.
_db_write_lock = asyncio.Lock()

# Throttle price_history inserts — WS events can fire many times per second, but
# we only need one snapshot per match every _HISTORY_INTERVAL seconds.
# Market and match price columns are still updated on every event (real-time).
_HISTORY_INTERVAL = 15.0  # seconds
_last_history_ts: dict[int, float] = {}  # match_id → last insert monotonic time

# Broadcast callbacks — registered by consumers (e.g. client WS router) that want
# to receive price updates. Called after each match spread recalculation.
# Signature: async fn(match_id: int, data: dict) -> None
_broadcast_callbacks: list[Callable[[int, dict], Awaitable[None]]] = []


def register_broadcast(fn: Callable[[int, dict], Awaitable[None]]) -> None:
    """Register a callback to receive price updates for broadcasting to clients."""
    _broadcast_callbacks.append(fn)


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
    await _update_market_and_matches(market_id, yes_price, no_price)


async def _on_kalshi_price(ticker: str, yes_price: float, no_price: float, volume: float) -> None:
    """Handle a Kalshi ticker event — look up market ID and update DB."""
    market_id = _kalshi_ticker_to_market.get(ticker)
    if not market_id:
        return
    await _update_market_and_matches(market_id, yes_price, no_price)


async def _update_market_and_matches(market_id: str, yes_price: float, no_price: float) -> None:
    """Update market prices in DB and recalculate all affected match spreads.

    Volume is intentionally NOT updated here — WS price_change events contain
    per-trade volume (not total market volume). Total volume is maintained by
    the REST discovery cycle via ingest_polymarket() / ingest_kalshi().

    price_history inserts are throttled to at most one row per match per
    _HISTORY_INTERVAL seconds to prevent millions of writes per day.
    Market and match price columns are still updated on every event.

    All DB writes are serialised under _db_write_lock to prevent aiosqlite
    "database is locked" errors from concurrent WS callbacks.

    After DB commit, price updates are broadcast to registered callbacks
    (e.g. client-facing /ws endpoint) outside the DB lock.
    """
    updates_to_broadcast: list[tuple[int, dict]] = []

    try:
        async with _db_write_lock:
            db = await get_db()
            now = datetime.now(timezone.utc).isoformat()
            now_ts = time.monotonic()

            # 1. Update market prices only — leave volume untouched
            await db.execute(
                "UPDATE markets SET yes_price = ?, no_price = ?, last_updated = ? WHERE id = ?",
                (yes_price, no_price, now, market_id),
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
                        last_updated = ?
                       WHERE id = ?""",
                    (
                        sd["raw_spread"], sd["fee_adjusted_spread"],
                        poly_yes, kalshi_yes,
                        now, match["id"],
                    ),
                )

                # 3. Throttled price_history insert — max one per match per interval
                match_id = match["id"]
                if now_ts - _last_history_ts.get(match_id, 0.0) >= _HISTORY_INTERVAL:
                    await db.execute(
                        """INSERT INTO price_history
                           (match_id, polymarket_yes, kalshi_yes, spread,
                            fee_adjusted_spread, recorded_at)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (
                            match_id, poly_yes, kalshi_yes,
                            sd["raw_spread"], sd["fee_adjusted_spread"], now,
                        ),
                    )
                    _last_history_ts[match_id] = now_ts

                # Collect broadcast payload (sent outside the lock)
                updates_to_broadcast.append((match_id, {
                    "type": "price_update",
                    "match_id": match_id,
                    "poly_yes": round(poly_yes, 6),
                    "poly_no": round(1.0 - poly_yes, 6),
                    "kalshi_yes": round(kalshi_yes, 6),
                    "kalshi_no": round(1.0 - kalshi_yes, 6),
                    "spread": round(sd["raw_spread"], 6),
                    "fee_adjusted_spread": round(sd["fee_adjusted_spread"], 6),
                    "last_updated": now,
                }))

            await db.commit()

    except Exception as exc:
        logger.error("WS price update failed for %s: %s", market_id, exc, exc_info=True)
        return

    # Broadcast to registered consumers (e.g. client-facing /ws) outside the DB lock
    for match_id, payload in updates_to_broadcast:
        for cb in _broadcast_callbacks:
            try:
                await cb(match_id, payload)
            except Exception as exc:
                logger.debug("Broadcast callback failed for match %d: %s", match_id, exc)
