/**
 * earnings-service.js — Earnings report scraping, storage, and retrieval.
 *
 * Data sources:
 *   - SEC EDGAR full-text search API (10-K / 10-Q filings)
 *   - yahoo-finance2 (earnings calendar, EPS estimates vs actuals)
 *
 * Implements: #34
 */

import { getDb } from "../db/index.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EDGAR_FULL_TEXT_URL = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_SUBMISSIONS_URL = "https://data.sec.gov/submissions";
const EDGAR_FILING_URL = "https://www.sec.gov/Archives/edgar/data";

/** How many years of earnings history to backfill */
const BACKFILL_YEARS = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags and collapse whitespace to get clean plain text
 * suitable for Groq AI context.
 */
function htmlToText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Fetch JSON from a URL with a descriptive User-Agent (SEC EDGAR requires this).
 */
async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": `StockPulse/1.0 ${process.env.EDGAR_CONTACT_EMAIL || "contact@stockpulse.example"}`,
      Accept: "application/json",
      ...headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

/**
 * Fetch raw text (HTML or plain) from a URL.
 */
async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": `StockPulse/1.0 ${process.env.EDGAR_CONTACT_EMAIL || "contact@stockpulse.example"}`,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// SEC EDGAR — CIK lookup and filing retrieval
// ---------------------------------------------------------------------------

/**
 * Look up a company's SEC CIK number by ticker symbol.
 * Uses the EDGAR company search endpoint.
 */
async function getCIK(ticker) {
  const url = `${EDGAR_FULL_TEXT_URL}?q="0000"&dateRange=custom&startdt=2020-01-01&forms=10-K&entity=${encodeURIComponent(ticker)}`;
  // Use the EDGAR company tickers JSON (faster than full-text search for CIK lookup)
  const tickerUrl = "https://www.sec.gov/files/company_tickers.json";
  const data = await fetchJson(tickerUrl);
  
  const upperTicker = ticker.toUpperCase();
  for (const entry of Object.values(data)) {
    if (entry.ticker === upperTicker) {
      // CIK is zero-padded to 10 digits in EDGAR URLs
      return String(entry.cik_str).padStart(10, "0");
    }
  }
  throw new Error(`CIK not found for ticker: ${ticker}`);
}

/**
 * Fetch the list of recent 10-K and 10-Q filings for a company from EDGAR.
 */
async function getFilings(cik, forms = ["10-K", "10-Q"]) {
  const url = `${EDGAR_SUBMISSIONS_URL}/CIK${cik}.json`;
  const data = await fetchJson(url);

  const { accessionNumbers, filingDate, form, primaryDocument } =
    data.filings.recent;

  const filings = [];
  for (let i = 0; i < accessionNumbers.length; i++) {
    if (!forms.includes(form[i])) continue;
    filings.push({
      accessionNumber: accessionNumbers[i].replace(/-/g, ""),
      filingDate: filingDate[i],
      form: form[i],
      primaryDocument: primaryDocument[i],
      cik: cik.replace(/^0+/, ""), // strip leading zeros for URL
    });
  }
  return filings;
}

/**
 * Download the primary document for a filing and return clean plain text.
 */
async function fetchFilingText(cik, accessionNumber, primaryDocument) {
  const url = `${EDGAR_FILING_URL}/${cik}/${accessionNumber}/${primaryDocument}`;
  const html = await fetchText(url);
  return htmlToText(html);
}

// ---------------------------------------------------------------------------
// Yahoo Finance — earnings calendar + EPS data
// ---------------------------------------------------------------------------

/**
 * Fetch earnings calendar data (upcoming + historical) from yahoo-finance2.
 * Returns an array of { date, epsEstimate, epsActual, revenuEstimate, revenueActual }.
 */
async function fetchYahooEarnings(ticker) {
  // Dynamic import so the module is only loaded when needed
  const yf = await import("yahoo-finance2");
  const finance = yf.default;

  try {
    const result = await finance.earnings(ticker, { lang: "en-US" });
    return result?.earningsHistory?.history || [];
  } catch (err) {
    console.warn(`Yahoo Finance earnings fetch failed for ${ticker}:`, err.message);
    return [];
  }
}

/**
 * Fetch upcoming earnings dates from yahoo-finance2 earningsCalendar.
 */
async function fetchYahooUpcoming(ticker) {
  const yf = await import("yahoo-finance2");
  const finance = yf.default;

  try {
    const quote = await finance.quote(ticker, {
      fields: ["earningsTimestamp", "earningsTimestampStart", "earningsTimestampEnd"],
    });
    if (quote?.earningsTimestamp) {
      return new Date(quote.earningsTimestamp * 1000).toISOString().slice(0, 10);
    }
  } catch (err) {
    console.warn(`Yahoo upcoming fetch failed for ${ticker}:`, err.message);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Database write helpers
// ---------------------------------------------------------------------------

function upsertEarning(db, earning) {
  db.prepare(`
    INSERT INTO earnings (
      ticker, report_date, fiscal_quarter, fiscal_year,
      eps_estimate, eps_actual, eps_surprise,
      revenue_estimate, revenue_actual, revenue_surprise,
      report_time, status
    ) VALUES (
      @ticker, @report_date, @fiscal_quarter, @fiscal_year,
      @eps_estimate, @eps_actual, @eps_surprise,
      @revenue_estimate, @revenue_actual, @revenue_surprise,
      @report_time, @status
    )
    ON CONFLICT(ticker, report_date) DO UPDATE SET
      fiscal_quarter     = excluded.fiscal_quarter,
      fiscal_year        = excluded.fiscal_year,
      eps_estimate       = excluded.eps_estimate,
      eps_actual         = excluded.eps_actual,
      eps_surprise       = excluded.eps_surprise,
      revenue_estimate   = excluded.revenue_estimate,
      revenue_actual     = excluded.revenue_actual,
      revenue_surprise   = excluded.revenue_surprise,
      status             = excluded.status
  `).run(earning);
}

function upsertTranscript(db, transcript) {
  db.prepare(`
    INSERT INTO earnings_transcripts (ticker, report_date, source, content, filing_url)
    VALUES (@ticker, @report_date, @source, @content, @filing_url)
    ON CONFLICT(ticker, report_date, source) DO UPDATE SET
      content    = excluded.content,
      filing_url = excluded.filing_url
  `).run(transcript);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get upcoming earnings reports (next N days).
 */
export async function getUpcomingEarnings(days = 14) {
  const db = getDb();
  return db
    .prepare(
      `SELECT e.*, s.name as company_name FROM earnings e
       LEFT JOIN stocks s ON e.ticker = s.ticker
       WHERE e.status = 'upcoming'
         AND e.report_date BETWEEN date('now') AND date('now', '+' || ? || ' days')
       ORDER BY e.report_date ASC`
    )
    .all(String(days));
}

/**
 * Get all earnings history for a ticker (sorted newest first).
 */
export async function getEarningsHistory(ticker) {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM earnings WHERE ticker = ? ORDER BY report_date DESC"
    )
    .all(ticker.toUpperCase());
}

/**
 * Get a specific earnings report by ticker + date.
 */
export async function getEarningsReport(ticker, date) {
  const db = getDb();
  return (
    db
      .prepare("SELECT * FROM earnings WHERE ticker = ? AND report_date = ?")
      .get(ticker.toUpperCase(), date) || null
  );
}

/**
 * Get the transcript text for a specific earnings report.
 * Returns the most recent source (prefers 'sec_edgar').
 */
export async function getTranscript(ticker, date) {
  const db = getDb();
  return (
    db
      .prepare(
        `SELECT * FROM earnings_transcripts
         WHERE ticker = ? AND report_date = ?
         ORDER BY CASE source WHEN 'sec_edgar' THEN 0 ELSE 1 END
         LIMIT 1`
      )
      .get(ticker.toUpperCase(), date) || null
  );
}

/**
 * Scrape and store all earnings data for a ticker:
 *   1. Fetch EPS history from Yahoo Finance
 *   2. Fetch SEC EDGAR filings and store transcript text
 *   3. Upsert into earnings + earnings_transcripts tables
 */
export async function refreshEarnings(ticker) {
  const db = getDb();
  const upperTicker = ticker.toUpperCase();
  const results = { ticker: upperTicker, earnings: 0, transcripts: 0, errors: [] };

  // 1. Fetch EPS history from Yahoo Finance
  try {
    const history = await fetchYahooEarnings(upperTicker);
    for (const record of history) {
      const reportDate =
        record.quarter instanceof Date
          ? record.quarter.toISOString().slice(0, 10)
          : String(record.quarter).slice(0, 10);

      const epsActual = record.actual ?? null;
      const epsEstimate = record.estimate ?? null;
      const epsSurprise =
        epsActual != null && epsEstimate != null
          ? parseFloat(((epsActual - epsEstimate) / Math.abs(epsEstimate || 1)).toFixed(4))
          : null;

      upsertEarning(db, {
        ticker: upperTicker,
        report_date: reportDate,
        fiscal_quarter: null,
        fiscal_year: new Date(reportDate).getFullYear(),
        eps_estimate: epsEstimate,
        eps_actual: epsActual,
        eps_surprise: epsSurprise,
        revenue_estimate: null,
        revenue_actual: null,
        revenue_surprise: null,
        report_time: null,
        status: "reported",
      });
      results.earnings++;
    }
  } catch (err) {
    results.errors.push(`Yahoo Finance: ${err.message}`);
  }

  // 2. Check for upcoming earnings date
  try {
    const upcomingDate = await fetchYahooUpcoming(upperTicker);
    if (upcomingDate) {
      upsertEarning(db, {
        ticker: upperTicker,
        report_date: upcomingDate,
        fiscal_quarter: null,
        fiscal_year: new Date(upcomingDate).getFullYear(),
        eps_estimate: null,
        eps_actual: null,
        eps_surprise: null,
        revenue_estimate: null,
        revenue_actual: null,
        revenue_surprise: null,
        report_time: null,
        status: "upcoming",
      });
    }
  } catch (err) {
    results.errors.push(`Yahoo upcoming: ${err.message}`);
  }

  // 3. Fetch SEC EDGAR filings (10-K + 10-Q)
  try {
    const cik = await getCIK(upperTicker);
    const filings = await getFilings(cik, ["10-K", "10-Q"]);

    // Only process filings from the last BACKFILL_YEARS years
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - BACKFILL_YEARS);

    for (const filing of filings) {
      if (new Date(filing.filingDate) < cutoff) break; // filings are newest-first

      try {
        const text = await fetchFilingText(
          filing.cik,
          filing.accessionNumber,
          filing.primaryDocument
        );

        // Trim to configured limit (default 50k chars, ~12k tokens for Groq context)
        const maxChars = parseInt(process.env.TRANSCRIPT_MAX_CHARS || "50000", 10);
        const trimmedText = text.slice(0, maxChars);

        upsertTranscript(db, {
          ticker: upperTicker,
          report_date: filing.filingDate,
          source: "sec_edgar",
          content: trimmedText,
          filing_url: `${EDGAR_FILING_URL}/${filing.cik}/${filing.accessionNumber}/${filing.primaryDocument}`,
        });
        results.transcripts++;
      } catch (err) {
        results.errors.push(`Filing ${filing.accessionNumber}: ${err.message}`);
      }
    }
  } catch (err) {
    results.errors.push(`SEC EDGAR: ${err.message}`);
  }

  return results;
}

/**
 * Backfill earnings for a list of tickers.
 * Intended for initial data load — runs refreshEarnings() on each.
 */
export async function backfillEarnings(tickers) {
  const summary = [];
  for (const ticker of tickers) {
    try {
      const result = await refreshEarnings(ticker);
      summary.push(result);
      console.log(`Backfilled ${ticker}: ${result.earnings} earnings, ${result.transcripts} transcripts`);
    } catch (err) {
      console.error(`Backfill failed for ${ticker}:`, err.message);
      summary.push({ ticker, error: err.message });
    }
  }
  return summary;
}


