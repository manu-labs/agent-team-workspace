from fastapi import APIRouter, HTTPException, Query

from app.database import get_db

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("/")
async def list_matches(
    min_spread: float = Query(0, ge=0, description="Minimum fee-adjusted spread"),
    sort_by: str = Query("spread", description="Sort by: spread or volume"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """List matched market pairs sorted by fee-adjusted spread."""
    db = await get_db()

    if sort_by == "volume":
        order = "polymarket_volume + kalshi_volume DESC"
    else:
        order = "fee_adjusted_spread DESC"

    cursor = await db.execute(
        f"""SELECT * FROM matches
        WHERE fee_adjusted_spread >= ?
        ORDER BY {order}
        LIMIT ? OFFSET ?""",
        [min_spread, limit, skip],
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@router.get("/{match_id}")
async def get_match(match_id: int):
    """Get a specific matched pair with full details."""
    db = await get_db()
    cursor = await db.execute("SELECT * FROM matches WHERE id = ?", [match_id])
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Match not found")
    return dict(row)


@router.get("/{match_id}/history")
async def get_match_history(
    match_id: int,
    limit: int = Query(100, ge=1, le=1000),
):
    """Get price/spread history for a matched pair."""
    db = await get_db()

    cursor = await db.execute("SELECT id FROM matches WHERE id = ?", [match_id])
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Match not found")

    cursor = await db.execute(
        """SELECT * FROM price_history
        WHERE match_id = ?
        ORDER BY recorded_at DESC
        LIMIT ?""",
        [match_id, limit],
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]