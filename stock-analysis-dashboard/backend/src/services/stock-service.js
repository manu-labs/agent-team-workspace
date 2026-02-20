/**
 * Stock data service — fetches and caches stock profiles, prices, and search results.
 *
 * Data sources:
 * - Yahoo Finance (yahoo-finance2) for prices, profiles, and search
 *
 * Implements: #33
 */

import { getDb } from "../db/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search stocks by ticker or name using Yahoo Finance search API.
 * Falls back to local DB if Yahoo is unavailable.
 */
export async function searchStocks(query) {
  const yf = await import("yahoo-finance2");
  const yahoo = yf.default;

  try {
    const result = await yahoo.search(query, { newsCount: 0 });
    return (result.quotes || [])
      .filter((q) => q.quoteType === "EQUITY")
      .slice(0, 10)
      .map((q) => ({
        ticker: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        sector: null,
        exchange: q.exchange,
      }));
  } catch (err) {
    console.warn("[stock-service] Yahoo search failed, using local DB:", err.message);
    const db = getDb();
    return db
      .prepare(
        "SELECT ticker, name, sector, market_cap FROM stocks WHERE ticker LIKE ? OR name LIKE ? LIMIT 20"
      )
      .all(`%${query}%`, `%${query}%`);
  }
}

// ---------------------------------------------------------------------------
// Stock Profile
// ---------------------------------------------------------------------------

/**
 * Get full stock profile + latest price from Yahoo Finance.
 * Caches company info in the stocks table.
 */
export async function getStockProfile(ticker) {
  const yf = await import("yahoo-finance2");
  const yahoo = yf.default;
  const upperTicker = ticker.toUpperCase();
  const db = getDb();

  try {
    const quote = await yahoo.quote(upperTicker);

    const profile = {
      ticker: quote.symbol,
      name: quote.shortName || quote.longName || upperTicker,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      marketCap: quote.marketCap,
      pe: quote.trailingPE || null,
      high52w: quote.fiftyTwoWeekHigh,
      low52w: quote.fiftyTwoWeekLow,
      volume: quote.regularMarketVolume,
      avgVolume: quote.averageDailyVolume3Month,
      dividendYield: quote.dividendYield || null,
      beta: quote.beta || null,
      sector: quote.sector || null,
      industry: quote.industry || null,
      exchange: quote.exchange,
    };

    // Cache in stocks table
    db.prepare(
      `INSERT INTO stocks (ticker, name, sector, industry, market_cap, exchange, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(ticker) DO UPDATE SET
         name = excluded.name, sector = excluded.sector,
         industry = excluded.industry, market_cap = excluded.market_cap,
         exchange = excluded.exchange, updated_at = CURRENT_TIMESTAMP`
    ).run(
      profile.ticker,
      profile.name,
      profile.sector,
      profile.industry,
      profile.marketCap,
      profile.exchange
    );

    return profile;
  } catch (err) {
    // Return cached data if Yahoo fails
    const cached = db
      .prepare("SELECT * FROM stocks WHERE ticker = ?")
      .get(upperTicker);
    if (cached) return cached;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Price History
// ---------------------------------------------------------------------------

/**
 * Get historical prices for a stock from Yahoo Finance.
 * Caches daily prices in the prices table.
 */
export async function getStockPrices(ticker, range = "1M") {
  const yf = await import("yahoo-finance2");
  const yahoo = yf.default;
  const upperTicker = ticker.toUpperCase();

  const rangeConfig = {
    "1D": { period1: daysAgo(2), interval: "15m" },
    "1W": { period1: daysAgo(7), interval: "1h" },
    "1M": { period1: daysAgo(30), interval: "1d" },
    "3M": { period1: daysAgo(90), interval: "1d" },
    "6M": { period1: daysAgo(180), interval: "1d" },
    "1Y": { period1: daysAgo(365), interval: "1d" },
    "5Y": { period1: daysAgo(1825), interval: "1wk" },
  };

  const config = rangeConfig[range] || rangeConfig["1M"];

  try {
    const history = await yahoo.historical(upperTicker, {
      period1: config.period1,
      interval: config.interval,
    });

    const prices = history.map((d) => ({
      date:
        d.date instanceof Date
          ? d.date.toISOString().slice(0, 10)
          : String(d.date).slice(0, 10),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));

    // Cache daily prices in DB
    if (config.interval === "1d") {
      const db = getDb();
      const stmt = db.prepare(
        "INSERT OR IGNORE INTO prices (ticker, date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      for (const p of prices) {
        stmt.run(upperTicker, p.date, p.open, p.high, p.low, p.close, p.volume);
      }
    }

    return prices;
  } catch (err) {
    // Fallback to cached prices
    const db = getDb();
    const cached = db
      .prepare(
        "SELECT date, open, high, low, close, volume FROM prices WHERE ticker = ? ORDER BY date DESC LIMIT 365"
      )
      .all(upperTicker);
    if (cached.length > 0) return cached;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Trending
// ---------------------------------------------------------------------------

/**
 * Get trending stocks (pre-computed by cron, with fallback to popular stocks).
 */
export async function getTrendingStocks() {
  const db = getDb();

  const trending = db
    .prepare(
      `SELECT t.*, s.name, s.sector FROM trending t
       LEFT JOIN stocks s ON t.ticker = s.ticker
       ORDER BY t.score DESC LIMIT 20`
    )
    .all();

  if (trending.length > 0) return trending;

  // Fallback: return popular stocks we have data for
  return db
    .prepare(
      `SELECT s.ticker, s.name, s.sector, s.market_cap
       FROM stocks s
       ORDER BY s.market_cap DESC NULLS LAST
       LIMIT 20`
    )
    .all();
}

/**
 * Compute trending scores based on price change, volume ratio, and news mentions.
 * Called by the stock cron job.
 */
export function computeTrending() {
  const db = getDb();

  const tickers = db
    .prepare(
      "SELECT DISTINCT ticker FROM prices WHERE date >= date('now', '-5 days')"
    )
    .all()
    .map((r) => r.ticker);

  for (const ticker of tickers) {
    const latest = db
      .prepare("SELECT * FROM prices WHERE ticker = ? ORDER BY date DESC LIMIT 1")
      .get(ticker);
    const prev = db
      .prepare(
        "SELECT * FROM prices WHERE ticker = ? ORDER BY date DESC LIMIT 1 OFFSET 1"
      )
      .get(ticker);

    if (!latest || !prev) continue;

    const priceChangePct =
      prev.close > 0
        ? ((latest.close - prev.close) / prev.close) * 100
        : 0;

    const avgVolRow = db
      .prepare(
        "SELECT AVG(volume) as avg_vol FROM (SELECT volume FROM prices WHERE ticker = ? ORDER BY date DESC LIMIT 20)"
      )
      .get(ticker);
    const volumeRatio =
      avgVolRow && avgVolRow.avg_vol > 0
        ? latest.volume / avgVolRow.avg_vol
        : 1;

    const newsRow = db
      .prepare(
        `SELECT COUNT(*) as cnt FROM news_tickers
         WHERE ticker = ? AND news_id IN
           (SELECT id FROM news WHERE published_at >= datetime('now', '-24 hours'))`
      )
      .get(ticker);
    const newsCount = newsRow ? newsRow.cnt : 0;

    // Composite score: abs(price change) + volume spike + news activity
    const score =
      Math.abs(priceChangePct) * 2 + (volumeRatio - 1) * 10 + newsCount * 3;

    db.prepare(
      `INSERT INTO trending (ticker, score, price_change_pct, volume_ratio, computed_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(ticker) DO UPDATE SET
         score = excluded.score,
         price_change_pct = excluded.price_change_pct,
         volume_ratio = excluded.volume_ratio,
         computed_at = CURRENT_TIMESTAMP`
    ).run(ticker, score, priceChangePct, volumeRatio);
  }
}
