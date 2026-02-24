"""Background poller — periodic market ingestion, matching, and price history recording."""

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

logger = logging.getLogger(__name__)

_stop_event: asyncio.Event | None = None
_poll_task: asyncio.Task | None = None
_cycle_lock = asyncio.Lock()

# Tracks last completed cycle for the status endpoint
_last_run: dict | None = None


async def start() -> None:
    """Start the background poll loop as an asyncio task."""
    global _stop_event, _poll_task
    _stop_event = asyncio.Event()
    _poll_task = asyncio.create_task(_poll_loop(), name="arb-scanner-poller")
    logger.info(
        "Poller started — poll every %ds, match every %ds",
        settings.POLL_INTERVAL_SECONDS,
        settings.MATCH_INTERVAL_SECONDS,
    )


async def stop() -> None:
    """Signal the poll loop to stop and wait for it to finish."""
    global _stop_event, _poll_task
    if _stop_event:
        _stop_event.set()
    if _poll_task and not _poll_task.done():
        try:
            await asyncio.wait_for(_poll_task, timeout=10)
        except asyncio.TimeoutError:
            logger.warning("Poller did not stop cleanly within 10s — cancelling")
            _poll_task.cancel()
    logger.info("Poller stopped")


async def trigger_now() -> dict:
    """Trigger an immediate poll cycle (for the manual /poll endpoint).

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
    running = _poll_task is not None and not _poll_task.done()
    return {
        "running": running,
        "last_run": _last_run,
        "poll_interval_seconds": settings.POLL_INTERVAL_SECONDS,
        "match_interval_seconds": settings.MATCH_INTERVAL_SECONDS,
    }


async def _poll_loop() -> None:
    """Main poll loop — runs until stop() is called."""
    last_match_time = datetime.min.replace(tzinfo=timezone.utc)

    while not _stop_event.is_set():
        try:
            last_match_time = await _run_cycle(last_match_time)
        except Exception as exc:
            logger.error("Poll cycle failed unexpectedly: %s", exc, exc_info=True)

        # Sleep for poll interval, but wake immediately if stop is requested
        try:
            await asyncio.wait_for(
                asyncio.shield(_stop_event.wait()),
                timeout=settings.POLL_INTERVAL_SECONDS,
            )
            break  # stop was requested during sleep
        except asyncio.TimeoutError:
            pass  # normal — continue looping


async def _run_cycle(last_match_time: datetime) -> datetime:
    """Execute one full poll cycle under a lock (prevents concurrent runs).

    Steps:
      1. Ingest markets from Polymarket and Kalshi
      2. Embed new/changed markets (delta embed)
      3. Run LLM matcher if match interval elapsed or new markets appeared
      4. Refresh spreads for all existing matches with current prices
      5. Record price history snapshots for all active matches

    Returns updated last_match_time.
    """
    global _last_run

    async with _cycle_lock:
        started_at = datetime.now(timezone.utc)
        logger.info("Poll cycle starting")

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

        # --- Step 4: Refresh spreads for all existing matches ---
        spreads_updated = await _update_spreads(db)

        # --- Step 5: Record price history snapshots ---
        snapshots = await _record_snapshots(db)

        await db.commit()

        elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
        _last_run = {
            "started_at": started_at.isoformat(),
            "elapsed_seconds": round(elapsed, 2),
            "polymarket": poly_result,
            "kalshi": kalshi_result,
            "embed_count": embed_count,
            "match_result": match_result,
            "spreads_updated": spreads_updated,
            "snapshots_recorded": snapshots,
            "last_match_at": last_match_time.isoformat(),
        }
        logger.info("Poll cycle complete in %.1fs", elapsed)
        return last_match_time


async def _update_spreads(db) -> int:
    """Refresh spread data for all existing matches using current market prices.

    Called every cycle so the dashboard always shows fresh numbers even between
    full matcher runs.
    """
    cursor = await db.execute(
        "SELECT id, polymarket_id, kalshi_id FROM matches"
    )
    matches = await cursor.fetchall()
    updated = 0

    for match in matches:
        match_id = match["id"]

        poly_cur = await db.execute(
            "SELECT yes_price, volume FROM markets WHERE id = ?",
            [match["polymarket_id"]],
        )
        poly_row = await poly_cur.fetchone()

        kalshi_cur = await db.execute(
            "SELECT yes_price, volume FROM markets WHERE id = ?",
            [match["kalshi_id"]],
        )
        kalshi_row = await kalshi_cur.fetchone()

        if not poly_row or not kalshi_row:
            continue  # one side delisted or not yet ingested

        spread_data = calculate_spread(poly_row["yes_price"], kalshi_row["yes_price"])

        await db.execute(
            """UPDATE matches SET
                spread              = ?,
                fee_adjusted_spread = ?,
                polymarket_yes      = ?,
                kalshi_yes          = ?,
                polymarket_volume   = ?,
                kalshi_volume       = ?,
                last_updated        = ?
               WHERE id = ?""",
            (
                spread_data["raw_spread"],
                spread_data["fee_adjusted_spread"],
                poly_row["yes_price"],
                kalshi_row["yes_price"],
                poly_row["volume"],
                kalshi_row["volume"],
                datetime.now(timezone.utc).isoformat(),
                match_id,
            ),
        )
        updated += 1

    return updated


async def _record_snapshots(db) -> int:
    """Write a price_history row for every active match in this cycle."""
    cursor = await db.execute(
        """SELECT id, polymarket_yes, kalshi_yes, spread, fee_adjusted_spread
           FROM matches"""
    )
    matches = await cursor.fetchall()
    now = datetime.now(timezone.utc).isoformat()

    for match in matches:
        await db.execute(
            """INSERT INTO price_history
               (match_id, polymarket_yes, kalshi_yes, spread, fee_adjusted_spread, recorded_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                match["id"],
                match["polymarket_yes"],
                match["kalshi_yes"],
                match["spread"],
                match["fee_adjusted_spread"],
                now,
            ),
        )

    return len(matches)
