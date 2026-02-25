"""Shared pytest fixtures for arb-scanner backend tests."""

import pytest_asyncio
import aiosqlite


@pytest_asyncio.fixture
async def in_memory_db():
    """In-memory aiosqlite DB with the full production schema.

    Matches the schema in database.py so tests exercise real SQL paths.
    """
    async with aiosqlite.connect(":memory:") as db:
        db.row_factory = aiosqlite.Row
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
                clob_token_ids TEXT DEFAULT ''
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
        """)
        yield db
