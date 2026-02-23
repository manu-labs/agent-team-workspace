from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rsvp import RSVP
from app.schemas.rsvp import RSVPResponse

router = APIRouter(prefix="/rsvps", tags=["rsvps"])


@router.get("/", response_model=list[RSVPResponse])
async def list_rsvps(
    user_id: UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(RSVP)
    if user_id:
        query = query.where(RSVP.user_id == user_id)
    result = await db.execute(
        query.offset(skip).limit(limit).order_by(RSVP.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{rsvp_id}", response_model=RSVPResponse)
async def get_rsvp(rsvp_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RSVP).where(RSVP.id == rsvp_id))
    rsvp = result.scalar_one_or_none()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")
    return rsvp
