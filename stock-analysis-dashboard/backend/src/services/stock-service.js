/**
 * Stock data service — fetches and caches stock profiles, prices, and search results.
 *
 * Data sources:
 * - Yahoo Finance (yahoo-finance2) for prices, profiles, and search
 * - Alpha Vantage as backup for historical/intraday data
 *
 * Implements: #33
 */

import { getDb } from "../db/index.js";

export async function searchStocks(query) {
  // TODO (#33): Implement fuzzy search on stocks table (ticker + name)
  const db = getDb();
  const results = db
    .prepare("SELECT ticker, name, sector, market_cap FROM stocks WHERE ticker LIKE ? OR name LIKE ? LIMIT 20")
    .all(`%${query}%`, `%${query}%`);
  return results;
}

export async function getStockProfile(ticker) {
  // TODO (#33): Fetch from Yahoo Finance if not in DB or stale, then cache
  const db = getDb();
  return db.prepare("SELECT * FROM stocks WHERE ticker = ?").get(ticker.toUpperCase());
}

export async function getStockPrices(ticker, range = "1Y") {
  // TODO (#33): Fetch from Yahoo Finance, store in prices table
  const db = getDb();
  return db.prepare("SELECT * FROM prices WHERE ticker = ? ORDER BY date DESC").all(ticker.toUpperCase());
}

export async function getTrendingStocks() {
  // TODO (#33): Compute trending from volume spikes + price changes + news mentions
  const db = getDb();
  return db.prepare("SELECT * FROM trending ORDER BY score DESC LIMIT 20").all();
}

