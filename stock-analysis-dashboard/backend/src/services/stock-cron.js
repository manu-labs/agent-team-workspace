/**
 * stock-cron.js — Scheduled jobs for stock price refresh and trending computation.
 *
 * Jobs:
 *   - Every 15 min during market hours: refresh prices for tracked + favorited stocks
 *   - Every hour: recompute trending scores
 *
 * Implements: #33 (cron portion)
 */

import cron from "node-cron";
import { getDb } from "../db/index.js";
import { getStockPrices, computeTrending } from "./stock-service.js";

/** Tickers we proactively track for price data */
const TRACKED_TICKERS = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA",
  "JPM", "UNH", "V", "XOM", "MA", "JNJ", "PG", "AVGO",
  "COST", "ADBE", "WMT", "BAC", "KO", "CRM", "PEP",
];

async function refreshPrices() {
  const db = getDb();
  const favorites = db
    .prepare("SELECT DISTINCT ticker FROM favorites")
    .all()
    .map((r) => r.ticker);
  const tickers = [...new Set([...TRACKED_TICKERS, ...favorites])];

  console.log(`[stock-cron] Refreshing prices for ${tickers.length} tickers`);
  for (const ticker of tickers) {
    try {
      await getStockPrices(ticker, "1M");
    } catch (err) {
      console.error(
        `[stock-cron] Price refresh failed for ${ticker}:`,
        err.message
      );
    }
  }

  // Recompute trending after price refresh
  try {
    computeTrending();
    console.log("[stock-cron] Trending scores updated");
  } catch (err) {
    console.error("[stock-cron] Trending computation failed:", err.message);
  }

  console.log("[stock-cron] Price refresh complete");
}

export function registerStockCronJobs() {
  // Every 15 minutes during market hours (Mon-Fri 9am-4pm ET)
  cron.schedule(
    "*/15 9-16 * * 1-5",
    async () => {
      console.log("[stock-cron] Running price refresh...");
      await refreshPrices();
    },
    { timezone: "America/New_York" }
  );

  // Compute trending every hour on weekdays
  cron.schedule(
    "0 * * * 1-5",
    () => {
      try {
        computeTrending();
      } catch (err) {
        console.error("[stock-cron] Trending computation failed:", err.message);
      }
    },
    { timezone: "America/New_York" }
  );

  console.log("[stock-cron] Cron jobs registered");
}
