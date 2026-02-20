/**
 * Earnings report service — scrapes, stores, and serves earnings data.
 *
 * Data sources:
 * - SEC EDGAR for 10-K/10-Q filings and transcripts
 * - Financial Modeling Prep API for earnings calendar and EPS data
 * - Yahoo Finance for earnings dates and estimates
 *
 * Implements: #34
 */

import { getDb } from "../db/index.js";

export async function getUpcomingEarnings(days = 14) {
  // TODO (#34): Query earnings table for upcoming reports
  const db = getDb();
  return db
    .prepare(
      `SELECT e.*, s.name FROM earnings e
       LEFT JOIN stocks s ON e.ticker = s.ticker
       WHERE e.status = 'upcoming' AND e.report_date <= date('now', ? || ' days')
       ORDER BY e.report_date ASC`
    )
    .all(String(days));
}

export async function getEarningsHistory(ticker) {
  // TODO (#34): Return all earnings for a ticker
  const db = getDb();
  return db
    .prepare("SELECT * FROM earnings WHERE ticker = ? ORDER BY report_date DESC")
    .all(ticker.toUpperCase());
}

export async function getEarningsReport(ticker, date) {
  // TODO (#34): Return specific earnings report
  const db = getDb();
  return db
    .prepare("SELECT * FROM earnings WHERE ticker = ? AND report_date = ?")
    .get(ticker.toUpperCase(), date);
}

export async function getTranscript(ticker, date) {
  // TODO (#34): Return earnings transcript text
  const db = getDb();
  return db
    .prepare("SELECT * FROM earnings_transcripts WHERE ticker = ? AND report_date = ?")
    .get(ticker.toUpperCase(), date);
}

export async function refreshEarnings(ticker) {
  // TODO (#34): Trigger re-scrape from SEC EDGAR + financial APIs
  return { ticker: ticker.toUpperCase(), status: "queued" };
}
