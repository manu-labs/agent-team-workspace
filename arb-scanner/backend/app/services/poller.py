"""Background poller — periodic market ingestion, matching, and price history recording."""

import asyncio
import json
import logging
from datetime import datetime, timezone

from app.config import settings
from app.database import get_db
from app.models.market import NormalizedMarket
from app.services.calculator import calculate_spread
from app.services.kalshi import ingest_kalshi
from app.services.matcher import match_markets
from app.services.polymarket import ingest_polymarket

logger = logging.getLogger(__name__)

_stop_event: asyncio.Event | None = None
_poll_task: asyncio.Task | None = None
_cycle_lock = asyncio.Lock()

# Tracks the last completed cycle for the status endpoint
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

    Returns the cycle result or an error if a cycle is already running.
    """
    if _cycle_lock.locked():
        return {"status": "busy", "message": "A poll cycle is already running"}
    last_match_time = _last_run.get("last_match_at") if _last_run else None
    if isinstance(last_match_time, str):
        last_match_time = datetime.fromisoformat(last_match_time)
    if last_match_time is None:
        last_match_time = datetime.min.replace(tzinfo=timezone.utc)
    result = await _run_cycle(last_match_time)
    return {"status": "ok", "result": result}


async def get_status() -> dict:
    """Return current poller status for the status endpoint."""
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
            break  # stop was requested
        except asyncio.TimeoutError:
            pass  # normal timeout, loop again


async def _run_cycle(last_match_time: datetime) -> datetime:
    """Execute one full poll cycle under a lock (prevents concurrent runs).

    1. Ingest markets from both platforms
    2. Run LLM matcher if match interval has elapsed or new markets appeared
    3. Update spreads for all existing matches
    4. Record price history snapshots

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

        # --- Step 2: Matching (throttled) ---
        now = datetime.now(timezone.utc)
        seconds_since_match = (now - last_match_time).total_seconds()
        should_match = (
            seconds_since_match >= settings.MATCH_INTERVAL_SECONDS
            or new_markets > 0
        )

        matched_count = 0
        if should_match:
            poly_markets = await _load_markets(db, "polymarket")
            kalshi_markets = await _load_markets(db, "kalshi")

            if poly_markets and kalshi_markets:
                matched_pairs = await match_markets(poly_markets, kalshi_markets)
                matched_count = len(matched_pairs)
                for pair in matched_pairs:
                    await _upsert_match(db, pair)
                await db.commit()
                logger.info("Matcher: %d matched pairs upserted", matched_count)
            else:
                logger.info("Matcher skipped — no markets from one or both platforms")

            last_match_time = now

        # --- Step 3: Update spreads ---
        spreads_updated = await _update_spreads(db)

        # --- Step 4: Record price history ---
        snapshots = await _record_snapshots(db)

        await db.commit()

        elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
        _last_run = {
            "started_at": started_at.isoformat(),
            "elapsed_seconds": round(elapsed, 2),
            "polymarket": poly_result,
            "kalshi": kalshi_result,
            "matched_pairs": matched_count,
            "spreads_updated": spreads_updated,
            "snapshots_recorded": snapshots,
            "last_match_at": last_match_time.isoformat(),
        }
        logger.info("Poll cycle complete in %.1fs — %s", elapsed, _last_run)
        return last_match_time


async def _load_markets(db, platform: str) -> list[NormalizedMarket]:
    """Load all markets for a platform from DB and reconstruct NormalizedMarket objects."""
    cursor = await db.execute(
        "SELECT * FROM markets WHERE platform = ?", [platform]
    )
    rows = await cursor.fetchall()
    markets = []
    for row in rows:
        d = dict(row)
        try:
            raw_data = json.loads(d.get("raw_data") or "{}")
            end_date = datetime.fromisoformat(d["end_date"]) if d.get("end_date") else None
            last_updated = datetime.fromisoformat(d["last_updated"])
            markets.append(NormalizedMarket(
                id=d["id"],
                platform=d["platform"],
                question=d["question"],
                category=d.get("category") or "",
                yes_price=d["yes_price"],
                no_price=d["no_price"],
                volume=d.get("volume") or 0.0,
                end_date=end_date,
                url=d.get("url") or "",
                raw_data=raw_data,
                last_updated=last_updated,
            ))
        except Exception as exc:
            logger.warning("Skipping malformed market row %s: %s", d.get("id"), exc)
    return markets


async def _upsert_match(db, pair: dict) -> None:
    """Upsert a matched pair into the matches table with current spread data."""
    poly_id = pair.get("polymarket_id", "")
    kalshi_id = pair.get("kalshi_id", "")
    if not poly_id or not kalshi_id:
        logger.warning("Skipping match with missing IDs: %s", pair)
        return

    # Look up current prices from markets table
    poly_cursor = await db.execute(
        "SELECT yes_price, volume FROM markets WHERE id = ?", [poly_id]
    )
    poly_row = await poly_cursor.fetchone()

    kalshi_cursor = await db.execute(
        "SELECT yes_price, volume FROM markets WHERE id = ?", [kalshi_id]
    )
    kalshi_row = await kalshi_cursor.fetchone()

    poly_yes = poly_row["yes_price"] if poly_row else pair.get("polymarket_yes", 0.0)
    kalshi_yes = kalshi_row["yes_price"] if kalshi_row else pair.get("kalshi_yes", 0.0)
    poly_vol = poly_row["volume"] if poly_row else 0.0
    kalshi_vol = kalshi_row["volume"] if kalshi_row else 0.0

    spread_data = calculate_spread(poly_yes, kalshi_yes)

    await db.execute(
        """
        INSERT INTO matches (polymarket_id, kalshi_id, confidence, spread,
                             fee_adjusted_spread, polymarket_yes, kalshi_yes,
                             polymarket_volume, kalshi_volume, question, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(polymarket_id, kalshi_id) DO UPDATE SET
            confidence          = excluded.confidence,
            spread              = excluded.spread,
            fee_adjusted_spread = excluded.fee_adjusted_spread,
            polymarket_yes      = excluded.polymarket_yes,
            kalshi_yes          = excluded.kalshi_yes,
            polymarket_volume   = excluded.polymarket_volume,
            kalshi_volume       = excluded.kalshi_volume,
            question            = excluded.question,
            last_updated        = excluded.last_updated
        """,
        (
            poly_id, kalshi_id,
            pair.get("confidence", 0.0),
            spread_data["raw_spread"],
            spread_data["fee_adjusted_spread"],
            poly_yes, kalshi_yes,
            poly_vol, kalshi_vol,
            pair.get("question", ""),
            datetime.now(timezone.utc).isoformat(),
        ),
    )


async def _update_spreads(db) -> int:
    """Refresh spread data for all existing matches from current market prices."""
    cursor = await db.execute(
        "SELECT id, polymarket_id, kalshi_id FROM matches"
    )
    matches = await cursor.fetchall()
    updated = 0

    for match in matches:
        match_id = match["id"]
        poly_id = match["polymarket_id"]
        kalshi_id = match["kalshi_id"]

        poly_cur = await db.execute(
            "SELECT yes_price, volume FROM markets WHERE id = ?", [poly_id]
        )
        poly_row = await poly_cur.fetchone()
        kalshi_cur = await db.execute(
            "SELECT yes_price, volume FROM markets WHERE id = ?", [kalshi_id]
        )
        kalshi_row = await kalshi_cur.fetchone()

        if not poly_row or not kalshi_row:
            continue  # one side delisted

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
    """Write a price_history snapshot for every active match."""
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