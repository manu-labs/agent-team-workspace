from fastapi import APIRouter, HTTPException, Query

from app.database import get_db
from app.services.calculator import calculate_spread

router = APIRouter(prefix="/matches", tags=["matches"])

ORDER_MAP = {
    "volume": "MIN(m.polymarket_volume, m.kalshi_volume) DESC",
    "spread": "m.fee_adjusted_spread DESC",
}


@router.get("/")
async def list_matches(
    min_spread: float = Query(0, ge=0, description="Minimum fee-adjusted spread"),
    sort_by: str = Query("spread", description="Sort by: spread or volume"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """List matched market pairs with fee-adjusted spreads and market details."""
    db = await get_db()

    order = ORDER_MAP.get(sort_by, ORDER_MAP["spread"])

    cursor = await db.execute(
        f"""SELECT
            m.id, m.polymarket_id, m.kalshi_id, m.confidence,
            m.spread, m.fee_adjusted_spread,
            m.polymarket_yes, m.kalshi_yes,
            m.polymarket_volume, m.kalshi_volume,
            m.question, m.last_updated,
            pm.question AS polymarket_question, pm.url AS polymarket_url,
            pm.end_date AS polymarket_end_date, pm.category,
            km.question AS kalshi_question, km.url AS kalshi_url,
            km.end_date AS kalshi_end_date
        FROM matches m
        LEFT JOIN markets pm ON m.polymarket_id = pm.id
        LEFT JOIN markets km ON m.kalshi_id = km.id
        WHERE m.fee_adjusted_spread >= ?
        ORDER BY {order}
        LIMIT ? OFFSET ?""",
        [min_spread, limit, skip],
    )
    rows = await cursor.fetchall()

    results = []
    for row in rows:
        r = dict(row)
        spread_info = calculate_spread(
            r.get("polymarket_yes") or 0,
            r.get("kalshi_yes") or 0,
        )
        r["direction"] = spread_info["direction"]
        r["profitable"] = spread_info["profitable"]
        r["polymarket_fee"] = spread_info["polymarket_fee"]
        r["kalshi_fee"] = spread_info["kalshi_fee"]
        results.append(r)

    return results


@router.get("/{match_id}")
async def get_match(match_id: int):
    """Get a specific matched pair with full details."""
    db = await get_db()
    cursor = await db.execute(
        """SELECT
            m.*, pm.question AS polymarket_question, pm.url AS polymarket_url,
            pm.end_date AS polymarket_end_date, pm.category,
            km.question AS kalshi_question, km.url AS kalshi_url,
            km.end_date AS kalshi_end_date
        FROM matches m
        LEFT JOIN markets pm ON m.polymarket_id = pm.id
        LEFT JOIN markets km ON m.kalshi_id = km.id
        WHERE m.id = ?""",
        [match_id],
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Match not found")

    r = dict(row)
    spread_info = calculate_spread(
        r.get("polymarket_yes") or 0,
        r.get("kalshi_yes") or 0,
    )
    r["direction"] = spread_info["direction"]
    r["profitable"] = spread_info["profitable"]
    r["polymarket_fee"] = spread_info["polymarket_fee"]
    r["kalshi_fee"] = spread_info["kalshi_fee"]
    return r


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