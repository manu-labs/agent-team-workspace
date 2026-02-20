/**
 * news-service.js — Financial news aggregation from multiple sources.
 *
 * Data sources:
 *   - Finnhub API (company news + general market news)
 *   - RSS feeds (Reuters, CNBC, MarketWatch, Bloomberg) — no key required
 *
 * Implements: #35
 */

import { getDb } from "../db/index.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FINNHUB_BASE = "https://finnhub.io/api/v1";

/** RSS feeds from major financial outlets */
const RSS_FEEDS = [
  { url: "https://feeds.reuters.com/reuters/businessNews",    publisher: "Reuters" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", publisher: "CNBC" },
  { url: "https://feeds.marketwatch.com/marketwatch/topstories", publisher: "MarketWatch" },
  { url: "https://finance.yahoo.com/news/rssindex",           publisher: "Yahoo Finance" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_bulletins", publisher: "MarketWatch Bulletins" },
];

/** Common US stock tickers used for mention extraction */
const COMMON_TICKERS = new Set([
  "AAPL","MSFT","NVDA","AMZN","GOOGL","GOOG","META","TSLA","BRK-A","BRK-B",
  "LLY","JPM","UNH","V","XOM","MA","JNJ","PG","AVGO","HD",
  "CVX","MRK","ABBV","COST","ADBE","WMT","BAC","KO","CRM",
  "PEP","TMO","ACN","MCD","CSCO","ABT","DHR","NKE","LIN",
  "TXN","NEE","ORCL","PM","AMD","QCOM","UPS","HON","AMGN",
  "BMY","LOW","INTU","SPGI","RTX","SPY","QQQ","DIA",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/rss+xml, application/xml, text/xml" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

/**
 * Very simple XML/RSS parser — extracts <item> blocks and key fields.
 * Avoids a heavy dependency for a straightforward feed format.
 */
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item[\s\S]*?<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[0];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/${tag}>|<${tag}[^>]*>([^<]*)<\/${tag}>`));
      return m ? (m[1] || m[2] || "").trim() : "";
    };
    const title = get("title");
    const link = get("link") || get("guid");
    const description = get("description") || get("summary");
    const pubDate = get("pubDate") || get("dc:date");
    if (title && link) {
      items.push({ title, url: link, summary: description, published_at: pubDate ? new Date(pubDate).toISOString() : null });
    }
  }
  return items;
}

/**
 * Extract stock ticker mentions from article text.
 * Looks for uppercase word tokens that match known tickers.
 */
function extractTickers(text) {
  const words = text.match(/[A-Z]{1,5}(-[A-Z])?/g) || [];
  return [...new Set(words.filter((w) => COMMON_TICKERS.has(w)))];
}

// ---------------------------------------------------------------------------
// Ingestion
// ---------------------------------------------------------------------------

/**
 * Insert a news article into the DB (deduplicates on URL).
 * Returns the row id, or null if it was a duplicate.
 */
function insertNews(db, article) {
  try {
    const result = db
      .prepare(`
        INSERT INTO news (title, summary, url, source, publisher, image_url, published_at)
        VALUES (@title, @summary, @url, @source, @publisher, @image_url, @published_at)
      `)
      .run(article);
    return result.lastInsertRowid;
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed")) return null; // duplicate
    throw err;
  }
}

function insertNewsTickerAssociations(db, newsId, tickers) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO news_tickers (news_id, ticker, relevance_score)
    VALUES (?, ?, ?)
  `);
  for (const ticker of tickers) {
    stmt.run(newsId, ticker, 1.0);
  }
}

/**
 * Fetch market news from Finnhub and store in DB.
 */
async function ingestFinnhubMarketNews() {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.warn("[news] FINNHUB_API_KEY not set — skipping Finnhub");
    return 0;
  }

  const db = getDb();
  const url = `${FINNHUB_BASE}/news?category=general&token=${apiKey}`;
  const articles = await fetchJson(url);
  let inserted = 0;

  for (const a of articles) {
    const newsId = insertNews(db, {
      title: a.headline,
      summary: a.summary,
      url: a.url,
      source: "finnhub",
      publisher: a.source,
      image_url: a.image || null,
      published_at: a.datetime ? new Date(a.datetime * 1000).toISOString() : null,
    });
    if (newsId) {
      const tickers = extractTickers(`${a.headline} ${a.summary || ""}`);
      if (a.related) tickers.push(...a.related.split(",").map(t => t.trim()).filter(t => COMMON_TICKERS.has(t)));
      insertNewsTickerAssociations(db, newsId, [...new Set(tickers)]);
      inserted++;
    }
  }
  return inserted;
}

/**
 * Fetch company-specific news from Finnhub and store in DB.
 */
async function ingestFinnhubStockNews(ticker) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return 0;

  const db = getDb();
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const url = `${FINNHUB_BASE}/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${apiKey}`;
  const articles = await fetchJson(url);
  let inserted = 0;

  for (const a of articles) {
    const newsId = insertNews(db, {
      title: a.headline,
      summary: a.summary,
      url: a.url,
      source: "finnhub",
      publisher: a.source,
      image_url: a.image || null,
      published_at: a.datetime ? new Date(a.datetime * 1000).toISOString() : null,
    });
    if (newsId) {
      insertNewsTickerAssociations(db, newsId, [ticker]);
      inserted++;
    }
  }
  return inserted;
}

/**
 * Fetch and parse all configured RSS feeds, store in DB.
 */
async function ingestRSSFeeds() {
  const db = getDb();
  let inserted = 0;

  for (const feed of RSS_FEEDS) {
    try {
      const xml = await fetchText(feed.url);
      const items = parseRSS(xml);

      for (const item of items) {
        const tickers = extractTickers(`${item.title} ${item.summary || ""}`);
        const newsId = insertNews(db, {
          title: item.title,
          summary: item.summary || null,
          url: item.url,
          source: "rss",
          publisher: feed.publisher,
          image_url: null,
          published_at: item.published_at,
        });
        if (newsId) {
          insertNewsTickerAssociations(db, newsId, tickers);
          inserted++;
        }
      }
    } catch (err) {
      console.warn(`[news] RSS feed failed (${feed.publisher}):`, err.message);
    }
  }
  return inserted;
}

/**
 * Run a full news ingestion cycle: Finnhub + all RSS feeds.
 * Called by the cron job every 10 minutes.
 */
export async function refreshNews() {
  const results = { finnhub: 0, rss: 0, errors: [] };

  try {
    results.finnhub = await ingestFinnhubMarketNews();
  } catch (err) {
    results.errors.push(`Finnhub: ${err.message}`);
  }

  try {
    results.rss = await ingestRSSFeeds();
  } catch (err) {
    results.errors.push(`RSS: ${err.message}`);
  }

  console.log(`[news] Refresh: ${results.finnhub} Finnhub + ${results.rss} RSS articles inserted`);
  return results;
}

/**
 * Fetch fresh news for a specific ticker (on-demand, e.g. when viewing a stock detail page).
 */
export async function refreshStockNews(ticker) {
  const inserted = await ingestFinnhubStockNews(ticker.toUpperCase());
  console.log(`[news] Stock refresh for ${ticker}: ${inserted} articles inserted`);
  return { ticker, inserted };
}

// ---------------------------------------------------------------------------
// Public read API
// ---------------------------------------------------------------------------

export async function getMarketNews(limit = 20, offset = 0) {
  const db = getDb();
  const news = db
    .prepare("SELECT * FROM news ORDER BY published_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset);
  const { count } = db.prepare("SELECT COUNT(*) as count FROM news").get();
  return { news, total: count };
}

export async function getStockNews(ticker) {
  const db = getDb();
  // Trigger a fresh fetch in the background on every stock-page load
  ingestFinnhubStockNews(ticker.toUpperCase()).catch(() => {});

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
  const db = getDb();
  return db
    .prepare(
      `SELECT n.*, COUNT(nt.ticker) as mention_count FROM news n
       JOIN news_tickers nt ON n.id = nt.news_id
       WHERE n.published_at >= datetime('now', '-48 hours')
       GROUP BY n.id
       ORDER BY mention_count DESC, n.published_at DESC
       LIMIT 20`
    )
    .all();
}

