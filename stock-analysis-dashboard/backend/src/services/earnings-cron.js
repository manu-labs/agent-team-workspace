/**
 * earnings-cron.js — Scheduled jobs for earnings data refresh.
 *
 * Jobs:
 *   - Daily at 6am ET: refresh upcoming earnings for the next 30 days
 *   - Daily at 7am ET: update status of past-due upcoming earnings to "reported"
 *
 * Implements: #34 (cron portion)
 */

import cron from "node-cron";
import { getDb } from "../db/index.js";
import { refreshEarnings } from "./earnings-service.js";

/** Tickers we proactively track (top 50 US stocks by market cap) */
const TRACKED_TICKERS = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "BRK-B",
  "LLY", "JPM", "UNH", "V", "XOM", "MA", "JNJ", "PG", "AVGO", "HD",
  "CVX", "MRK", "ABBV", "COST", "ADBE", "WMT", "BAC", "KO", "CRM",
  "PEP", "TMO", "ACN", "MCD", "CSCO", "ABT", "DHR", "NKE", "LIN",
  "TXN", "NEE", "ORCL", "PM", "AMD", "QCOM", "UPS", "HON", "AMGN",
  "BMY", "LOW", "INTU", "SPGI", "RTX",
];

/**
 * Mark any "upcoming" earnings that are now past-due as "reported".
 * Runs after market close each day.
 */
function markPastEarningsReported() {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE earnings SET status = 'reported' WHERE status = 'upcoming' AND report_date < date('now')"
    )
    .run();
  if (result.changes > 0) {
    console.log(`[earnings-cron] Marked ${result.changes} earnings as reported`);
  }
}

/**
 * Refresh earnings data for all favorited + tracked tickers.
 */
async function refreshAllTracked() {
  const db = getDb();

  // Combine tracked list with any user favorites
  const favorites = db.prepare("SELECT DISTINCT ticker FROM favorites").all().map(r => r.ticker);
  const tickers = [...new Set([...TRACKED_TICKERS, ...favorites])];

  console.log(`[earnings-cron] Starting refresh for ${tickers.length} tickers`);
  for (const ticker of tickers) {
    try {
      await refreshEarnings(ticker);
    } catch (err) {
      console.error(`[earnings-cron] Failed to refresh ${ticker}:`, err.message);
    }
  }
  console.log("[earnings-cron] Refresh complete");
}

/**
 * Register all earnings cron jobs.
 * Call this once during server startup.
 */
export function registerEarningsCronJobs() {
  // Daily at 6:00 AM ET — refresh earnings data
  cron.schedule("0 6 * * 1-5", async () => {
    console.log("[earnings-cron] Running daily earnings refresh...");
    await refreshAllTracked();
  }, { timezone: "America/New_York" });

  // Daily at 7:00 AM ET — mark past-due upcoming as reported
  cron.schedule("0 7 * * 1-5", () => {
    console.log("[earnings-cron] Marking past-due earnings as reported...");
    markPastEarningsReported();
  }, { timezone: "America/New_York" });

  console.log("[earnings-cron] Cron jobs registered");
}

