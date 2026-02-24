"""Poll router — manual trigger and status endpoints."""

from fastapi import APIRouter

from app.services import poller

router = APIRouter(prefix="/poll", tags=["poll"])


@router.post("/")
async def trigger_poll():
    """Trigger an immediate poll cycle (skips the interval timer).

    Returns the cycle result, or a 'busy' message if already running.
    """
    return await poller.trigger_now()


@router.get("/status")
async def poll_status():
    """Return current poller status and last run metrics."""
    return await poller.get_status()