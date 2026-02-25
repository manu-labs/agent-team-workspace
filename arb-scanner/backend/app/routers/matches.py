from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query

from app.database import get_db
from app.services.calculator import calculate_spread

router = APIRouter(prefix="/matches", tags=["matches"])

ORDER_MAP = {
    "volume": "MIN(m.polymarket_volume, m.kalshi_volume) DESC",
    "spread": "m.fee_adjusted_spread DESC",
    "confidence": "m.confidence DESC",
    "end_date": "COALESCE(pm.end_date, km.end_date) ASC",
}


def _serialize_match(row: dict) -> dict:
    """Map internal DB fields to the frontend Match type."""
    poly_yes = row.get("polymarket_yes") or 0
    kalshi_yes = row.get("kalshi_yes") or 0
    spread_info = calculate_spread(poly_yes, kalshi_yes)

    # Use actual no_price from markets table (falls back to 1 - yes if not available)
    poly_no = row.get("polymarket_no") if row.get("polymarket_no") is not None else round(1 - poly_yes, 4)
    kalshi_no = row.get("kalshi_no") if row.get("kalshi_no") is not None else round(1 - kalshi_yes, 4)

    return {
        "id": str(row["id"]),
        "question": row.get("question") or row.get("polymarket_question") or "",
        "poly_yes": poly_yes,
        "poly_no": poly_no,
        "kalshi_yes": kalshi_yes,
        "kalshi_no": kalshi_no,
        "raw_spread": row.get("spread") or 0,
        "fee_adjusted_spread": row.get("fee_adjusted_spread") or 0,
        "direction": spread_info["direction"],
        "volume": min(row.get("polymarket_volume") or 0, row.get("kalshi_volume") or 0),
        "poly_volume": row.get("polymarket_volume") or 0,
        "kalshi_volume": row.get("kalshi_volume") or 0,
        "end_date": row.get("polymarket_end_date") or row.get("kalshi_end_date") or "",
        "poly_url": row.get("polymarket_url") or "",
        "kalshi_url": row.get("kalshi_url") or "",
        "confidence": row.get("confidence") or 0,
        "last_updated": row.get("last_updated") or "",
        "polymarket_fee": spread_info["polymarket_fee"],
        "kalshi_fee": spread_info["kalshi_fee"],
        "profitable": spread_info["profitable"],
        "category": row.get("category") or "",
        "kalshi_category": row.get("kalshi_category") or "",
    }


def _serialize_snapshot(row: dict) -> dict:
    """Map internal DB fields to the frontend PriceSnapshot type."""
    poly_yes = row.get("polymarket_yes") or 0
    kalshi_yes = row.get("kalshi_yes") or 0
    return {
        "timestamp": row.get("recorded_at") or "",
        "poly_yes": poly_yes,
        "poly_no": round(1 - poly_yes, 4),
        "kalshi_yes": kalshi_yes,
        "kalshi_no": round(1 - kalshi_yes, 4),
        "raw_spread": row.get("spread") or 0,
        "fee_adjusted_spread": row.get("fee_adjusted_spread") or 0,
    }


@router.get("")
@router.get("/")
async def list_matches(
    min_spread: float = Query(0, ge=0, description="Minimum fee-adjusted spread"),
    min_volume: float = Query(0, ge=0, description="Minimum volume (min of both platforms)"),
    ending_within_days: int = Query(0, ge=0, description="Only show markets ending within N days (0 = no filter)"),
    sort_by: str = Query("volume", description="Sort by: spread, volume, confidence, or end_date"),
    category: str = Query("Sports", description="Filter by Kalshi market category (default: Sports). Pass empty string for all."),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """List matched market pairs with fee-adjusted spreads and market details."""
    db = await get_db()

    order = ORDER_MAP.get(sort_by, ORDER_MAP["volume"])

    # Build WHERE clause dynamically
    where_clauses = [
        "m.fee_adjusted_spread >= ?",
        "MIN(m.polymarket_volume, m.kalshi_volume) >= ?",
    ]
    params: list = [min_spread, min_volume]

    if ending_within_days > 0:
        cutoff = (datetime.now(timezone.utc) + timedelta(days=ending_within_days)).isoformat()
        where_clauses.append("COALESCE(pm.end_date, km.end_date) <= ?")
        where_clauses.append("COALESCE(pm.end_date, km.end_date) >= ?")
        params.append(cutoff)
        params.append(datetime.now(timezone.utc).isoformat())

    if category:
        where_clauses.append("km.category = ?")
        params.append(category)

    where_sql = " AND ".join(where_clauses)
    params.extend([limit, skip])

    cursor = await db.execute(
        f"""SELECT
            m.id, m.polymarket_id, m.kalshi_id, m.confidence,
            m.spread, m.fee_adjusted_spread,
            m.polymarket_yes, m.kalshi_yes,
            m.polymarket_volume, m.kalshi_volume,
            m.question, m.last_updated,
            pm.question AS polymarket_question, pm.url AS polymarket_url,
            pm.end_date AS polymarket_end_date, pm.category,
            pm.no_price AS polymarket_no,
            km.question AS kalshi_question, km.url AS kalshi_url,
            km.end_date AS kalshi_end_date,
            km.no_price AS kalshi_no,
            km.category AS kalshi_category
        FROM matches m
        LEFT JOIN markets pm ON m.polymarket_id = pm.id
        LEFT JOIN markets km ON m.kalshi_id = km.id
        WHERE {where_sql}
        ORDER BY {order}
        LIMIT ? OFFSET ?""",
        params,
    )
    rows = await cursor.fetchall()
    return [_serialize_match(dict(row)) for row in rows]


@router.get("/{match_id}")
async def get_match(match_id: int):
    """Get a specific matched pair with full details."""
    db = await get_db()
    cursor = await db.execute(
        """SELECT
            m.id, m.polymarket_id, m.kalshi_id, m.confidence,
            m.spread, m.fee_adjusted_spread,
            m.polymarket_yes, m.kalshi_yes,
            m.polymarket_volume, m.kalshi_volume,
            m.question, m.last_updated,
            pm.question AS polymarket_question, pm.url AS polymarket_url,
            pm.end_date AS polymarket_end_date, pm.category,
            pm.no_price AS polymarket_no,
            km.question AS kalshi_question, km.url AS kalshi_url,
            km.end_date AS kalshi_end_date,
            km.no_price AS kalshi_no,
            km.category AS kalshi_category
        FROM matches m
        LEFT JOIN markets pm ON m.polymarket_id = pm.id
        LEFT JOIN markets km ON m.kalshi_id = km.id
        WHERE m.id = ?""",
        [match_id],
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Match not found")

    return _serialize_match(dict(row))


@router.delete("/{match_id}")
async def delete_match(match_id: int):
    """Delete a specific match (and its price history) by ID.

    Used for manual false-positive removal. Deletes price_history first to
    satisfy the FK constraint before removing the match row.
    """
    db = await get_db()
    cursor = await db.execute("SELECT id FROM matches WHERE id = ?", [match_id])
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Match not found")

    await db.execute("DELETE FROM price_history WHERE match_id = ?", [match_id])
    await db.execute("DELETE FROM matches WHERE id = ?", [match_id])
    await db.commit()

    return {"status": "ok", "deleted_match_id": match_id}


@router.get("/{match_id}/history")
async def get_match_history(
    match_id: int,
    hours: int = Query(24, ge=1, le=168, description="Hours of history to return"),
    limit: int = Query(500, ge=1, le=1000),
):
    """Get price/spread history for a matched pair."""
    db = await get_db()

    cursor = await db.execute("SELECT id FROM matches WHERE id = ?", [match_id])
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Match not found")

    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()

    cursor = await db.execute(
        """SELECT * FROM price_history
        WHERE match_id = ? AND recorded_at >= ?
        ORDER BY recorded_at ASC
        LIMIT ?""",
        [match_id, cutoff, limit],
    )
    rows = await cursor.fetchall()
    return [_serialize_snapshot(dict(row)) for row in rows]
