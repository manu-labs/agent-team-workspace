from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.event import Event, Platform
from app.schemas.event import EventResponse
from app.services.scraper import scrape_and_upsert

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/scrape")
async def trigger_scrape(db: AsyncSession = Depends(get_db)) -> dict[str, int]:
    """Trigger a scrape of rsvpatx.com and upsert results into the database.

    Returns counts of events found, newly inserted, updated, and errors.
    """
    return await scrape_and_upsert(db)


@router.get("/", response_model=list[EventResponse])
async def list_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    platform: Platform | None = Query(None, description="Filter by platform"),
    date_from: date | None = Query(None, description="Only events on or after this date"),
    date_to: date | None = Query(None, description="Only events on or before this date"),
    search: str | None = Query(None, description="Case-insensitive title search"),
    db: AsyncSession = Depends(get_db),
):
    """List events with optional filtering by platform, date range, and title search."""
    query = select(Event)

    if platform is not None:
        query = query.where(Event.platform == platform)
    if date_from is not None:
        query = query.where(Event.date >= date_from)
    if date_to is not None:
        query = query.where(Event.date <= date_to)
    if search:
        query = query.where(Event.title.ilike(f"%{search}%"))

    result = await db.execute(query.offset(skip).limit(limit).order_by(Event.date.asc()))
    return result.scalars().all()


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
