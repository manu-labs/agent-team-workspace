#\!/usr/bin/env node
/**
 * backfill-earnings.js — One-time script to populate historical earnings data.
 *
 * Usage:
 *   node src/scripts/backfill-earnings.js [TICKER1 TICKER2 ...]
 *
 * If no tickers are specified, runs for the default tracked list (top 50 US stocks).
 * Fetches ~3 years of earnings history and SEC EDGAR transcripts.
 *
 * Implements: #34 (backfill subtask)
 */

import { initDb } from "../db/index.js";
import { backfillEarnings } from "../services/earnings-service.js";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_TICKERS = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA",
  "JPM", "UNH", "V", "XOM", "MA", "JNJ", "PG", "AVGO",
  "COST", "ADBE", "WMT", "BAC", "KO", "CRM", "PEP", "TMO",
  "MCD", "CSCO", "ABT", "DHR", "NKE", "AMD", "QCOM",
];

async function main() {
  initDb();

  const tickers =
    process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_TICKERS;

  console.log(`Starting earnings backfill for ${tickers.length} tickers...`);
  console.log(`Tickers: ${tickers.join(", ")}`);
  console.log("");

  const start = Date.now();
  const results = await backfillEarnings(tickers);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const succeeded = results.filter((r) => \!r.error).length;
  const failed = results.filter((r) => r.error).length;
  const totalEarnings = results.reduce((sum, r) => sum + (r.earnings || 0), 0);
  const totalTranscripts = results.reduce((sum, r) => sum + (r.transcripts || 0), 0);

  console.log("");
  console.log("=== Backfill Complete ===");
  console.log(`  Time:        ${elapsed}s`);
  console.log(`  Tickers:     ${succeeded} OK, ${failed} failed`);
  console.log(`  Earnings:    ${totalEarnings} records stored`);
  console.log(`  Transcripts: ${totalTranscripts} SEC filings stored`);

  if (failed > 0) {
    console.log("");
    console.log("Failed tickers:");
    results.filter((r) => r.error).forEach((r) => {
      console.log(`  ${r.ticker}: ${r.error}`);
    });
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Backfill crashed:", err);
  process.exit(1);
});
