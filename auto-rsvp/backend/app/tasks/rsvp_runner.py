"""Background job runner: scrape -> match -> RSVP pipeline.

Orchestrates the full auto-RSVP workflow:
1. Scrape events from rsvpatx.com
2. Match events to each user's preferences via AI
3. Auto-RSVP to top matches on supported platforms
4. Report results
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session
from app.models.rsvp import RSVP, RSVPStatus
from app.models.user import User
from app.services.integrations import RSVPResult, get_integration
from app.services.matcher import match_events_for_user
from app.services.scraper import scrape_and_upsert

logger = logging.getLogger(__name__)

# Module-level state for job status tracking
_last_run: dict | None = None
_running = False


def get_job_status() -> dict:
    """Return the current job runner status."""
    return {
        "running": _running,
        "last_run": _last_run,
    }


async def run_pipeline() -> dict:
    """Execute the full auto-RSVP pipeline.

    Returns a summary dict with counts for each step.
    """
    global _last_run, _running

    if _running:
        return {"error": "Pipeline is already running"}

    _running = True
    started_at = datetime.now(timezone.utc)
    summary = {
        "started_at": started_at.isoformat(),
        "scrape": {},
        "match": {},
        "rsvp": {"attempted": 0, "success": 0, "failed": 0, "skipped": 0},
    }

    try:
        async with async_session() as db:
            # Step 1: Scrape
            logger.info("Pipeline step 1/3: Scraping events...")
            scrape_result = await scrape_and_upsert(db)
            summary["scrape"] = scrape_result
            logger.info("Scrape complete: %s", scrape_result)

            # Step 2: Match for each user
            logger.info("Pipeline step 2/3: Matching events to users...")
            users_result = await db.execute(select(User))
            users = users_result.scalars().all()
            match_summary = {"users_processed": 0, "total_matches": 0, "errors": 0}

            for user in users:
                if not user.interests_description:
                    continue
                try:
                    results = await match_events_for_user(user.id, db)
                    match_summary["users_processed"] += 1
                    match_summary["total_matches"] += len(
                        [r for r in results if r["status"] == "pending"]
                    )
                except Exception as exc:
                    logger.error("Matching failed for user %s: %s", user.id, exc)
                    match_summary["errors"] += 1

            summary["match"] = match_summary
            logger.info("Matching complete: %s", match_summary)

            # Step 3: RSVP for all pending
            logger.info("Pipeline step 3/3: Processing pending RSVPs...")
            await _process_pending_rsvps(db, summary["rsvp"])

        summary["completed_at"] = datetime.now(timezone.utc).isoformat()
        summary["success"] = True

    except Exception as exc:
        logger.error("Pipeline failed: %s", exc, exc_info=True)
        summary["error"] = str(exc)
        summary["success"] = False

    finally:
        _running = False
        _last_run = summary

    logger.info("Pipeline complete: %s", summary)
    return summary


async def _process_pending_rsvps(db: AsyncSession, rsvp_summary: dict) -> None:
    """Process all pending RSVPs, one at a time with delay between attempts."""
    result = await db.execute(
        select(RSVP)
        .where(RSVP.status == RSVPStatus.pending)
        .order_by(RSVP.match_score.desc())
    )
    pending = result.scalars().all()

    if not pending:
        logger.info("No pending RSVPs to process")
        return

    logger.info("Processing %d pending RSVPs...", len(pending))

    for rsvp in pending:
        rsvp_summary["attempted"] += 1
        try:
            await _attempt_rsvp(rsvp, db)
            if rsvp.status == RSVPStatus.success:
                rsvp_summary["success"] += 1
            elif rsvp.status == RSVPStatus.skipped:
                rsvp_summary["skipped"] += 1
            else:
                rsvp_summary["failed"] += 1
        except Exception as exc:
            logger.error("Unexpected error processing RSVP %s: %s", rsvp.id, exc)
            rsvp.status = RSVPStatus.failed
            rsvp.error_message = str(exc)
            rsvp.attempted_at = datetime.now(timezone.utc)
            rsvp_summary["failed"] += 1

        await db.commit()

        # Rate limiting: delay between RSVPs to avoid spamming platform APIs
        await asyncio.sleep(settings.RSVP_DELAY_SECONDS)


async def _attempt_rsvp(rsvp: RSVP, db: AsyncSession) -> None:
    """Attempt to RSVP for a single event with retries."""
    # Load the related event and user
    await db.refresh(rsvp, ["event", "user"])
    event = rsvp.event
    user = rsvp.user

    if not event or not user:
        rsvp.status = RSVPStatus.failed
        rsvp.error_message = "Event or user not found"
        rsvp.attempted_at = datetime.now(timezone.utc)
        return

    # Find the right integration
    integration = await get_integration(event.rsvp_url)
    if not integration:
        rsvp.status = RSVPStatus.skipped
        rsvp.error_message = f"No integration available for platform: {event.platform.value}"
        rsvp.attempted_at = datetime.now(timezone.utc)
        logger.info(
            "Skipping RSVP %s — no integration for %s", rsvp.id, event.platform.value
        )
        return

    # Mark as in_progress
    rsvp.status = RSVPStatus.in_progress
    rsvp.attempted_at = datetime.now(timezone.utc)
    await db.commit()

    # Attempt with retries
    last_result: RSVPResult | None = None
    for attempt in range(settings.RSVP_MAX_RETRIES):
        try:
            result = await integration.rsvp(
                event.rsvp_url, user.email, user.first_name, user.last_name
            )
            last_result = result

            if result.success:
                rsvp.status = RSVPStatus.success
                rsvp.error_message = None
                logger.info(
                    "RSVP success: user=%s event=%s (%s)",
                    user.email, event.title, result.message,
                )
                return

            # Non-retryable failures
            if result.status in ("paid_event", "already_registered", "event_full"):
                rsvp.status = (
                    RSVPStatus.already_full
                    if result.status == "event_full"
                    else RSVPStatus.failed
                )
                rsvp.error_message = result.message
                logger.info(
                    "RSVP non-retryable: user=%s event=%s status=%s",
                    user.email, event.title, result.status,
                )
                return

        except Exception as exc:
            logger.warning(
                "RSVP attempt %d/%d failed for %s: %s",
                attempt + 1, settings.RSVP_MAX_RETRIES, event.title, exc,
            )
            last_result = RSVPResult(
                success=False, status="failed", message=str(exc)
            )

        # Exponential backoff between retries
        if attempt < settings.RSVP_MAX_RETRIES - 1:
            await asyncio.sleep(2 ** attempt)

    # All retries exhausted
    rsvp.status = RSVPStatus.failed
    rsvp.error_message = last_result.message if last_result else "All retries exhausted"
    logger.warning(
        "RSVP failed after %d attempts: user=%s event=%s",
        settings.RSVP_MAX_RETRIES, user.email, event.title,
    )
