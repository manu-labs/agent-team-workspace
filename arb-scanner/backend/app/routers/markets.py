from fastapi import APIRouter, Query

from app.database import get_db

router = APIRouter(prefix="/markets", tags=["markets"])


@router.get("")
@router.get("/")
async def list_markets(
    platform: str | None = Query(None, description="Filter by platform"),
    category: str | None = Query(None, description="Filter by category"),
    search: str | None = Query(None, description="Search question text"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """List normalized markets from both platforms."""
    db = await get_db()
    query = "SELECT * FROM markets WHERE 1=1"
    params: list = []

    if platform:
        query += " AND platform = ?"
        params.append(platform)
    if category:
        query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND question LIKE ?"
        params.append(f"%{search}%")

    query += " ORDER BY volume DESC LIMIT ? OFFSET ?"
    params.extend([limit, skip])

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]