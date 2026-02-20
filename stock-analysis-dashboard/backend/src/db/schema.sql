-- StockPulse Database Schema
-- SQLite via better-sqlite3

-- ============================================================
-- Company master data
-- ============================================================
CREATE TABLE IF NOT EXISTS stocks (
  ticker TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT,
  industry TEXT,
  market_cap REAL,
  description TEXT,
  logo_url TEXT,
  exchange TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stocks_name ON stocks(name);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);

-- ============================================================
-- Daily price data
-- ============================================================
CREATE TABLE IF NOT EXISTS prices (
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume INTEGER,
  PRIMARY KEY (ticker, date),
  FOREIGN KEY (ticker) REFERENCES stocks(ticker)
);

-- ============================================================
-- User favorites
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT DEFAULT 'default',
  ticker TEXT NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, ticker),
  FOREIGN KEY (ticker) REFERENCES stocks(ticker)
);

-- ============================================================
-- Trending scores (computed from volume, price change, news)
-- ============================================================
CREATE TABLE IF NOT EXISTS trending (
  ticker TEXT PRIMARY KEY,
  score REAL NOT NULL DEFAULT 0,
  price_change_pct REAL,
  volume_ratio REAL,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticker) REFERENCES stocks(ticker)
);

-- ============================================================
-- Earnings calendar & results
-- ============================================================
CREATE TABLE IF NOT EXISTS earnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  report_date DATE NOT NULL,
  fiscal_quarter TEXT,
  fiscal_year INTEGER,
  eps_estimate REAL,
  eps_actual REAL,
  eps_surprise REAL,
  revenue_estimate REAL,
  revenue_actual REAL,
  revenue_surprise REAL,
  report_time TEXT,
  status TEXT DEFAULT 'upcoming',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ticker, report_date)
);

CREATE INDEX IF NOT EXISTS idx_earnings_ticker ON earnings(ticker);
CREATE INDEX IF NOT EXISTS idx_earnings_date ON earnings(report_date);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON earnings(status);

-- ============================================================
-- Earnings transcripts (for Groq AI analysis)
-- ============================================================
CREATE TABLE IF NOT EXISTS earnings_transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  report_date DATE NOT NULL,
  source TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  filing_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ticker, report_date, source)
);

-- ============================================================
-- News articles
-- ============================================================
CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT UNIQUE NOT NULL,
  source TEXT,
  publisher TEXT,
  image_url TEXT,
  published_at DATETIME,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at);

-- ============================================================
-- News-to-ticker associations
-- ============================================================
CREATE TABLE IF NOT EXISTS news_tickers (
  news_id INTEGER NOT NULL,
  ticker TEXT NOT NULL,
  relevance_score REAL DEFAULT 1.0,
  PRIMARY KEY (news_id, ticker),
  FOREIGN KEY (news_id) REFERENCES news(id),
  FOREIGN KEY (ticker) REFERENCES stocks(ticker)
);

-- ============================================================
-- AI response cache
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT UNIQUE NOT NULL,
  ticker TEXT,
  prompt_type TEXT,
  response TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_ticker ON ai_cache(ticker);

