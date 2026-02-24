"""Background poller — two-loop architecture:

  * Discovery loop  (every DISCOVERY_INTERVAL_SECONDS, default 1 hr):
      full ingest -> embed new -> match new pairs -> upsert matches -> sync WS subscriptions

  * Price-refresh loop  (every PRICE_REFRESH_INTERVAL_SECONDS, default 15 s):
      Fallback REST polling -- only active when BOTH WebSocket connections are down.
      When WS is connected, real-time updates arrive via ws_manager callbacks instead.
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.config import settings
from app.database import get_db
from app.services import ws_manager
from app.services.calculator import calculate_spread
from app.services.embeddings import embed_new_markets
from app.services.kalshi import ingest_kalshi
from app.services.matcher import match_markets
from app.services.polymarket import ingest_polymarket
from app.services.price_refresh import refresh_prices

logger = logging.getLogger(__name__)

_stop_event: asyncio.Event | None = None
_discovery_task: asyncio.Task | None = None
_refresh_task: asyncio.Task | None = None
_cycle_lock = asyncio.Lock()

# Tracks last completed cycle/refresh for the status endpoint
_last_run: dict | None = None
_last_refresh: dict | None = None


async def start() -> None:
    """Start the discovery loop and price-refresh fallback loop as asyncio tasks."""
    global _stop_event, _discovery_task, _refresh_task
    _stop_event = asyncio.Event()
    _discovery_task = asyncio.create_task(_discovery_loop(), name="discovery-loop")
    _refresh_task = asyncio.create_task(_price_refresh_loop(), name="price-refresh-loop")
    logger.info(
        "Poller started — discovery every %ds, REST price refresh fallback every %ds",
        settings.DISCOVERY_INTERVAL_SECONDS,
        settings.PRICE_REFRESH_INTERVAL_SECONDS,
    )


async def stop() -> None:
    """Signal both loops to stop and wait for them to finish."""
    global _stop_event, _discovery_task, _refresh_task
    if _stop_event:
        _stop_event.set()
    for task in (_discovery_task, _refresh_task):
        if task and not task.done():
            try:
                await asyncio.wait_for(task, timeout=10)
            except asyncio.TimeoutError:
                logger.warning("Task %s did not stop cleanly within 10s — cancelling", task.get_name())
                task.cancel()
    logger.info("Poller stopped")


async def trigger_now() -> dict:
    """Trigger an immediate discovery cycle (for the manual /poll endpoint).

    Returns the cycle result, or a busy message if a cycle is already running.
    """
    if _cycle_lock.locked():
        return {"status": "busy", "message": "A poll cycle is already running"}

    result = await _run_cycle()
    return {"status": "ok", "result": result}


async def get_status() -> dict:
    """Return current poller status, last run metrics, and WS connection state."""
    discovery_running = _discovery_task is not None and not _discovery_task.done()
    refresh_running = _refresh_task is not None and not _refresh_task.done()
    return {
        "running": discovery_running,
        "refresh_running": refresh_running,
        "last_run": _last_run,
        "last_refresh": _last_refresh,
        "discovery_interval_seconds": settings.DISCOVERY_INTERVAL_SECONDS,
        "price_refresh_interval_seconds": settings.PRICE_REFRESH_INTERVAL_SECONDS,
        "ws": ws_manager.get_ws_status(),
    }


async def _discovery_loop() -> None:
    """Discovery loop — runs until stop() is called.

    Fires every DISCOVERY_INTERVAL_SECONDS: full ingest, embed, match,
    diff cleanup, and WS subscription sync.
    """
    while not _stop_event.is_set():
        try:
            await _run_cycle()
        except Exception as exc:
            logger.error("Discovery cycle failed unexpectedly: %s", exc, exc_info=True)

        # Sleep for discovery interval, but wake immediately if stop is requested
        try:
            await asyncio.wait_for(
                asyncio.shield(_stop_event.wait()),
                timeout=settings.DISCOVERY_INTERVAL_SECONDS,
            )
            break  # stop was requested during sleep
        except asyncio.TimeoutError:
            pass  # normal — continue looping


async def _price_refresh_loop() -> None:
    """REST price-refresh fallback loop — runs until stop() is called.

    Only polls REST endpoints when BOTH WebSocket connections are down.
    When ws_manager.both_connected() is True, real-time WS callbacks handle
    price updates and this loop idles to avoid redundant API calls.

    Starts after a short initial delay to let the first discovery cycle and
    WS connections establish.
    """
    global _last_refresh

    # Short initial delay so the discovery cycle and WS can start first
    try:
        await asyncio.wait_for(
            asyncio.shield(_stop_event.wait()),
            timeout=10,
        )
        return  # stop was requested during initial delay
    except asyncio.TimeoutError:
        pass

    while not _stop_event.is_set():
        if ws_manager.both_connected():
            # WS is handling real-time updates — skip REST polling this cycle
            logger.debug("Price refresh skipped — WS connected, real-time updates active")
        else:
            try:
                db = await get_db()
                result = await refresh_prices(db)
                _last_refresh = {
                    "at": datetime.now(timezone.utc).isoformat(),
                    "source": "rest_fallback",
                    **result,
                }
            except Exception as exc:
                logger.error("Price refresh failed unexpectedly: %s", exc, exc_info=True)

        try:
            await asyncio.wait_for(
                asyncio.shield(_stop_event.wait()),
                timeout=settings.PRICE_REFRESH_INTERVAL_SECONDS,
            )
            break  # stop was requested during sleep
        except asyncio.TimeoutError:
            pass  # normal — continue looping


async def _run_cycle() -> None:
    """Execute one full discovery cycle under a lock (prevents concurrent runs).

    Steps:
      1. Ingest markets from Polymarket and Kalshi
      1.5. Diff-based cleanup — remove markets/matches no longer returned by either API
      2. Embed new/changed markets (delta embed — skips already-embedded)
      3. Run matcher on all pairs (skips already-confirmed pairs)
      4. Sync WS subscriptions — subscribe new matches, unsubscribe removed ones
    """
    global _last_run

    async with _cycle_lock:
        started_at = datetime.now(timezone.utc)
        logger.info("Discovery cycle starting")

        db = await get_db()

        # --- Step 1: Ingest ---
        poly_result = await ingest_polymarket()
        kalshi_result = await ingest_kalshi()

        new_markets = poly_result.get("upserted", 0) + kalshi_result.get("upserted", 0)
        logger.info(
            "Ingest: Polymarket=%s, Kalshi=%s, new/updated=%d",
            {k: v for k, v in poly_result.items() if k != "market_ids"},
            {k: v for k, v in kalshi_result.items() if k != "market_ids"},
            new_markets,
        )

        # --- Step 1.5: Diff-based cleanup ---
        # Remove markets and their associated matches/history that are no longer
        # returned by either API (e.g. closed, delisted, or expired markets).
        # Safety guard: skip if either platform returned 0 markets to avoid
        # accidentally wiping the entire DB on a transient API failure.
        poly_ids = poly_result.get("market_ids", [])
        kalshi_ids = kalshi_result.get("market_ids", [])
        poly_fetched = poly_result.get("fetched", 0)
        kalshi_fetched = kalshi_result.get("fetched", 0)

        if poly_fetched > 0 and kalshi_fetched > 0 and poly_ids and kalshi_ids:
            all_active_ids = poly_ids + kalshi_ids
            poly_ph = ",".join("?" * len(poly_ids))
            kalshi_ph = ",".join("?" * len(kalshi_ids))
            all_ph = ",".join("?" * len(all_active_ids))

            # 1. Delete price history for matches linked to stale markets (FK constraint)
            await db.execute(
                f"""DELETE FROM price_history WHERE match_id IN (
                    SELECT id FROM matches
                    WHERE polymarket_id NOT IN ({poly_ph})
                       OR kalshi_id NOT IN ({kalshi_ph})
                )""",
                poly_ids + kalshi_ids,
            )

            # 2. Delete stale matches
            await db.execute(
                f"""DELETE FROM matches
                    WHERE polymarket_id NOT IN ({poly_ph})
                       OR kalshi_id NOT IN ({kalshi_ph})""",
                poly_ids + kalshi_ids,
            )

            # 3. Delete orphaned embeddings (FK constraint — must precede markets delete)
            await db.execute(
                f"DELETE FROM market_embeddings WHERE market_id NOT IN ({all_ph})",
                all_active_ids,
            )

            # 4. Delete stale markets
            await db.execute(
                f"DELETE FROM markets WHERE id NOT IN ({all_ph})",
                all_active_ids,
            )

            await db.commit()
            logger.info(
                "Diff cleanup complete — active: %d poly + %d kalshi = %d total markets",
                len(poly_ids), len(kalshi_ids), len(all_active_ids),
            )
        else:
            logger.warning(
                "Skipping diff cleanup — safety guard triggered "
                "(poly_fetched=%d, kalshi_fetched=%d)",
                poly_fetched, kalshi_fetched,
            )

        # --- Step 2: Embed new/changed markets ---
        embed_count = await embed_new_markets(db)
        logger.info("Embed delta: %d markets embedded", embed_count)

        # --- Step 3: Match (always runs, skips already-confirmed pairs) ---
        now = datetime.now(timezone.utc)

        # Fetch active markets from DB for matching (includes end_date for
        # Groq LLM confirmation prompt — prevents false matches on markets
        # with similar questions but different resolution deadlines)
        poly_cur = await db.execute(
            "SELECT id, question, category, yes_price, no_price, volume, url, end_date "
            "FROM markets WHERE platform = 'polymarket'"
            "  AND volume > 0 AND yes_price BETWEEN 0.01 AND 0.99"
        )
        poly_markets = [dict(r) for r in await poly_cur.fetchall()]

        kalshi_cur = await db.execute(
            "SELECT id, question, category, yes_price, no_price, volume, url, end_date "
            "FROM markets WHERE platform = 'kalshi'"
            "  AND volume > 0 AND yes_price BETWEEN 0.01 AND 0.99"
        )
        kalshi_markets = [dict(r) for r in await kalshi_cur.fetchall()]

        confirmed = await match_markets(poly_markets, kalshi_markets)

        # Upsert confirmed matches into the matches table
        for m in confirmed:
            sd = calculate_spread(m["polymarket_yes"], m["kalshi_yes"])
            await db.execute(
                """INSERT INTO matches (polymarket_id, kalshi_id, confidence, spread,
                                       fee_adjusted_spread, polymarket_yes, kalshi_yes,
                                       question, last_updated)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(polymarket_id, kalshi_id) DO UPDATE SET
                       confidence = excluded.confidence,
                       last_updated = excluded.last_updated""",
                (m["polymarket_id"], m["kalshi_id"], m["confidence"],
                 sd["raw_spread"], sd["fee_adjusted_spread"],
                 m["polymarket_yes"], m["kalshi_yes"], m["question"],
                 now.isoformat()),
            )

        match_result = {
            "confirmed": len(confirmed),
            "poly_count": len(poly_markets),
            "kalshi_count": len(kalshi_markets),
        }
        logger.info("Matcher: %s", match_result)

        await db.commit()

        # --- Step 4: Sync WS subscriptions ---
        # Subscribe to any newly confirmed match tokens, unsubscribe from removed ones.
        # This is a no-op if ws_manager hasn't started yet (startup ordering).
        try:
            await ws_manager.sync_subscriptions()
        except Exception as exc:
            logger.warning("WS subscription sync failed: %s", exc)

        elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
        _last_run = {
            "started_at": started_at.isoformat(),
            "elapsed_seconds": round(elapsed, 2),
            "polymarket": {k: v for k, v in poly_result.items() if k != "market_ids"},
            "kalshi": {k: v for k, v in kalshi_result.items() if k != "market_ids"},
            "embed_count": embed_count,
            "match_result": match_result,
        }
        logger.info("Discovery cycle complete in %.1fs", elapsed)
