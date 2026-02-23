"""Match endpoints — trigger and retrieve AI-powered event matching."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rsvp import RSVP
from app.services.matcher import match_events_for_user

router = APIRouter(prefix="/match", tags=["matching"])


@router.post("/{user_id}")
async def trigger_matching(user_id: UUID, db: AsyncSession = Depends(get_db)):
    """Trigger AI matching for a user against all events in the DB."""
    try:
        results = await match_events_for_user(user_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Matching failed: {exc}")

    auto_rsvp = [r for r in results if r["status"] == "pending"]
    recommended = [r for r in results if 0.4 <= r["score"] < 0.7]
    skipped = [r for r in results if r["score"] < 0.4]

    return {
        "user_id": str(user_id),
        "total_events": len(results),
        "auto_rsvp_count": len(auto_rsvp),
        "recommended_count": len(recommended),
        "skipped_count": len(skipped),
        "results": results,
    }


@router.get("/{user_id}")
async def get_match_results(user_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get existing match scores for a user."""
    result = await db.execute(
        select(RSVP).where(RSVP.user_id == user_id).order_by(RSVP.match_score.desc())
    )
    rsvps = result.scalars().all()
    if not rsvps:
        raise HTTPException(status_code=404, detail="No match results found for this user")

    return {
        "user_id": str(user_id),
        "total": len(rsvps),
        "results": [
            {
                "event_id": str(r.event_id),
                "match_score": r.match_score,
                "status": r.status.value,
            }
            for r in rsvps
        ],
    }
