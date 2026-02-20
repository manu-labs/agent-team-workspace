/**
 * News aggregation service — fetches, deduplicates, and serves financial news.
 *
 * Data sources:
 * - Finnhub for company and market news
 * - NewsAPI for general financial news search
 * - RSS feeds from major financial outlets
 *
 * Implements: #35
 */

import { getDb } from "../db/index.js";

export async function getMarketNews(limit = 20, offset = 0) {
  // TODO (#35): Return paginated market news
  const db = getDb();
  const news = db
    .prepare("SELECT * FROM news ORDER BY published_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset);
  const total = db.prepare("SELECT COUNT(*) as count FROM news").get().count;
  return { news, total };
}

export async function getStockNews(ticker) {
  // TODO (#35): Return news associated with a specific ticker
  const db = getDb();
  return db
    .prepare(
      `SELECT n.* FROM news n
       JOIN news_tickers nt ON n.id = nt.news_id
       WHERE nt.ticker = ?
       ORDER BY n.published_at DESC
       LIMIT 50`
    )
    .all(ticker.toUpperCase());
}

export async function getTrendingNews() {
  // TODO (#35): Return most-discussed news (highest ticker association count)
  const db = getDb();
  return db
    .prepare(
      `SELECT n.*, COUNT(nt.ticker) as mention_count FROM news n
       JOIN news_tickers nt ON n.id = nt.news_id
       GROUP BY n.id
       ORDER BY mention_count DESC, n.published_at DESC
       LIMIT 20`
    )
    .all();
}

