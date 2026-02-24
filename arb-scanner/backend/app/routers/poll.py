"""Poll router — manual trigger, status, and admin cleanup endpoints."""

from fastapi import APIRouter

from app.database import get_db
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


@router.post("/cleanup")
async def cleanup_stale_data():
    """Remove cached matches, markets, embeddings, and history that don't meet
    the current 7-day expiry + $20K volume criteria.
    """
    db = await get_db()

    # Count before cleanup
    before_matches = (await (await db.execute("SELECT COUNT(*) FROM matches")).fetchone())[0]
    before_markets = (await (await db.execute("SELECT COUNT(*) FROM markets")).fetchone())[0]
    before_history = (await (await db.execute("SELECT COUNT(*) FROM price_history")).fetchone())[0]
    before_embeddings = (await (await db.execute("SELECT COUNT(*) FROM market_embeddings")).fetchone())[0]

    # 1. Delete price history for matches that will be removed
    await db.execute("""
        DELETE FROM price_history WHERE match_id IN (
            SELECT m.id FROM matches m
            LEFT JOIN markets pm ON m.polymarket_id = pm.id
            LEFT JOIN markets km ON m.kalshi_id = km.id
            WHERE COALESCE(pm.volume, 0) < 20000
               OR COALESCE(km.volume, 0) < 20000
               OR pm.end_date IS NULL
               OR km.end_date IS NULL
               OR pm.end_date <= datetime('now')
               OR km.end_date <= datetime('now')
               OR pm.end_date > datetime('now', '+7 days')
               OR km.end_date > datetime('now', '+7 days')
        )
    """)

    # 2. Delete matches where either market doesn't meet criteria
    await db.execute("""
        DELETE FROM matches WHERE id IN (
            SELECT m.id FROM matches m
            LEFT JOIN markets pm ON m.polymarket_id = pm.id
            LEFT JOIN markets km ON m.kalshi_id = km.id
            WHERE COALESCE(pm.volume, 0) < 20000
               OR COALESCE(km.volume, 0) < 20000
               OR pm.end_date IS NULL
               OR km.end_date IS NULL
               OR pm.end_date <= datetime('now')
               OR km.end_date <= datetime('now')
               OR pm.end_date > datetime('now', '+7 days')
               OR km.end_date > datetime('now', '+7 days')
        )
    """)

    # 3. Delete markets that don't meet criteria
    await db.execute("""
        DELETE FROM markets WHERE
            volume < 20000
            OR end_date IS NULL
            OR end_date <= datetime('now')
            OR end_date > datetime('now', '+7 days')
    """)

    # 4. Delete orphaned embeddings (market was deleted)
    await db.execute("""
        DELETE FROM market_embeddings
        WHERE market_id NOT IN (SELECT id FROM markets)
    """)

    await db.commit()

    # Count after cleanup
    after_matches = (await (await db.execute("SELECT COUNT(*) FROM matches")).fetchone())[0]
    after_markets = (await (await db.execute("SELECT COUNT(*) FROM markets")).fetchone())[0]
    after_history = (await (await db.execute("SELECT COUNT(*) FROM price_history")).fetchone())[0]
    after_embeddings = (await (await db.execute("SELECT COUNT(*) FROM market_embeddings")).fetchone())[0]

    return {
        "status": "ok",
        "deleted": {
            "matches": before_matches - after_matches,
            "markets": before_markets - after_markets,
            "price_history": before_history - after_history,
            "embeddings": before_embeddings - after_embeddings,
        },
        "remaining": {
            "matches": after_matches,
            "markets": after_markets,
            "price_history": after_history,
            "embeddings": after_embeddings,
        },
    }
