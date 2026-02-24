"""Background poller — two-loop architecture:

  • Discovery loop  (every DISCOVERY_INTERVAL_SECONDS, default 30 min):
      full ingest → embed → LLM match → upsert matches

  • Price-refresh loop  (every PRICE_REFRESH_INTERVAL_SECONDS, default 15 s):
      fetch current prices for matched markets only → update spreads + snapshots
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.config import settings
from app.database import get_db
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
    """Start the discovery loop and price-refresh loop as asyncio tasks."""
    global _stop_event, _discovery_task, _refresh_task
    _stop_event = asyncio.Event()
    _discovery_task = asyncio.create_task(_discovery_loop(), name="discovery-loop")
    _refresh_task = asyncio.create_task(_price_refresh_loop(), name="price-refresh-loop")
    logger.info(
        "Poller started — discovery every %ds, price refresh every %ds",
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

    last_match_time = None
    if _last_run and _last_run.get("last_match_at"):
        try:
            last_match_time = datetime.fromisoformat(_last_run["last_match_at"])
        except ValueError:
            pass
    if last_match_time is None:
        last_match_time = datetime.min.replace(tzinfo=timezone.utc)

    result = await _run_cycle(last_match_time)
    return {"status": "ok", "result": result}


async def get_status() -> dict:
    """Return current poller status and last run metrics."""
    discovery_running = _discovery_task is not None and not _discovery_task.done()
    refresh_running = _refresh_task is not None and not _refresh_task.done()
    return {
        "running": discovery_running,
        "refresh_running": refresh_running,
        "last_run": _last_run,
        "last_refresh": _last_refresh,
        "discovery_interval_seconds": settings.DISCOVERY_INTERVAL_SECONDS,
        "price_refresh_interval_seconds": settings.PRICE_REFRESH_INTERVAL_SECONDS,
        "match_interval_seconds": settings.MATCH_INTERVAL_SECONDS,
    }


async def _discovery_loop() -> None:
    """Discovery loop — runs until stop() is called.

    Fires every DISCOVERY_INTERVAL_SECONDS: full ingest, embed, and match.
    """
    last_match_time = datetime.min.replace(tzinfo=timezone.utc)

    while not _stop_event.is_set():
        try:
            last_match_time = await _run_cycle(last_match_time)
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
    """Price-refresh loop — runs until stop() is called.

    Fires every PRICE_REFRESH_INTERVAL_SECONDS: fetches live prices for matched
    markets only (typically ~50-100 markets), updates spreads, and records snapshots.
    Starts after a short initial delay to let the first discovery cycle populate matches.
    """
    global _last_refresh

    # Short initial delay so the first discovery cycle can run first
    try:
        await asyncio.wait_for(
            asyncio.shield(_stop_event.wait()),
            timeout=10,
        )
        return  # stop was requested during initial delay
    except asyncio.TimeoutError:
        pass

    while not _stop_event.is_set():
        try:
            db = await get_db()
            result = await refresh_prices(db)
            _last_refresh = {
                "at": datetime.now(timezone.utc).isoformat(),
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


async def _run_cycle(last_match_time: datetime) -> datetime:
    """Execute one full discovery cycle under a lock (prevents concurrent runs).

    Steps:
      1. Ingest markets from Polymarket and Kalshi
      2. Embed new/changed markets (delta embed)
      3. Run LLM matcher if match interval elapsed or new markets appeared

    Spread updates and price history snapshots are handled by the price-refresh loop.

    Returns updated last_match_time.
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
            poly_result, kalshi_result, new_markets,
        )

        # --- Step 2: Embed new/changed markets ---
        embed_count = await embed_new_markets(db)
        logger.info("Embed delta: %d markets embedded", embed_count)

        # --- Step 3: Matching (throttled by interval or triggered by new markets) ---
        now = datetime.now(timezone.utc)
        seconds_since_match = (now - last_match_time).total_seconds()
        should_match = (
            seconds_since_match >= settings.MATCH_INTERVAL_SECONDS
            or new_markets > 0
        )

        match_result: dict = {}
        if should_match:
            # Fetch active markets from DB for matching
            poly_cur = await db.execute(
                "SELECT id, question, category, yes_price, no_price, volume, url "
                "FROM markets WHERE platform = 'polymarket'"
                "  AND volume > 0 AND yes_price BETWEEN 0.02 AND 0.98"
            )
            poly_markets = [dict(r) for r in await poly_cur.fetchall()]

            kalshi_cur = await db.execute(
                "SELECT id, question, category, yes_price, no_price, volume, url "
                "FROM markets WHERE platform = 'kalshi'"
                "  AND volume > 0 AND yes_price BETWEEN 0.02 AND 0.98"
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

            last_match_time = now
            match_result = {
                "confirmed": len(confirmed),
                "poly_count": len(poly_markets),
                "kalshi_count": len(kalshi_markets),
            }
            logger.info("Matcher: %s", match_result)
        else:
            logger.info(
                "Matcher skipped — %ds since last run (threshold: %ds)",
                int(seconds_since_match), settings.MATCH_INTERVAL_SECONDS,
            )

        await db.commit()

        elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
        _last_run = {
            "started_at": started_at.isoformat(),
            "elapsed_seconds": round(elapsed, 2),
            "polymarket": poly_result,
            "kalshi": kalshi_result,
            "embed_count": embed_count,
            "match_result": match_result,
            "last_match_at": last_match_time.isoformat(),
        }
        logger.info("Discovery cycle complete in %.1fs", elapsed)
        return last_match_time
