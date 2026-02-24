import os

import aiosqlite

from app.config import settings

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)
        _db = await aiosqlite.connect(settings.DB_PATH)
        _db.row_factory = aiosqlite.Row
    return _db


async def init_db():
    db = await get_db()
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS markets (
            id TEXT PRIMARY KEY,
            platform TEXT NOT NULL,
            question TEXT NOT NULL,
            category TEXT DEFAULT '',
            yes_price REAL NOT NULL,
            no_price REAL NOT NULL,
            volume REAL DEFAULT 0,
            end_date TEXT,
            url TEXT DEFAULT '',
            raw_data TEXT DEFAULT '{}',
            last_updated TEXT NOT NULL,
            embed_text TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            polymarket_id TEXT NOT NULL,
            kalshi_id TEXT NOT NULL,
            confidence REAL DEFAULT 0,
            spread REAL DEFAULT 0,
            fee_adjusted_spread REAL DEFAULT 0,
            polymarket_yes REAL,
            kalshi_yes REAL,
            polymarket_volume REAL,
            kalshi_volume REAL,
            question TEXT,
            last_updated TEXT NOT NULL,
            UNIQUE(polymarket_id, kalshi_id)
        );

        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL,
            polymarket_yes REAL,
            kalshi_yes REAL,
            spread REAL,
            fee_adjusted_spread REAL,
            recorded_at TEXT NOT NULL,
            FOREIGN KEY (match_id) REFERENCES matches(id)
        );

        CREATE TABLE IF NOT EXISTS market_embeddings (
            market_id TEXT PRIMARY KEY,
            embedding BLOB NOT NULL,
            question_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (market_id) REFERENCES markets(id)
        );

        CREATE INDEX IF NOT EXISTS idx_markets_platform ON markets(platform);
        CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
        CREATE INDEX IF NOT EXISTS idx_markets_volume ON markets(volume);
        CREATE INDEX IF NOT EXISTS idx_price_history_match ON price_history(match_id);
        CREATE INDEX IF NOT EXISTS idx_price_history_time ON price_history(recorded_at);
        CREATE INDEX IF NOT EXISTS idx_embeddings_market ON market_embeddings(market_id);
    """)

    # Migration: add embed_text column to existing databases that predate this column
    try:
        await db.execute("ALTER TABLE markets ADD COLUMN embed_text TEXT DEFAULT ''")
    except Exception:
        pass  # Column already exists — safe to ignore

    await db.commit()


async def close_db():
    global _db
    if _db:
        await _db.close()
        _db = None
