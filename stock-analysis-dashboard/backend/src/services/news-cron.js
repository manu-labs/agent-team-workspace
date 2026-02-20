/**
 * news-cron.js — Scheduled news ingestion (every 10 minutes on weekdays).
 * Implements: #35 (cron portion)
 */

import cron from "node-cron";
import { refreshNews } from "./news-service.js";

export function registerNewsCronJobs() {
  // Every 10 minutes, Mon-Fri during market hours (7am-8pm ET)
  cron.schedule("*/10 7-20 * * 1-5", async () => {
    try {
      await refreshNews();
    } catch (err) {
      console.error("[news-cron] Refresh failed:", err.message);
    }
  }, { timezone: "America/New_York" });

  // Also run once on startup to seed initial news
  refreshNews().catch((err) => {
    console.warn("[news-cron] Initial fetch failed:", err.message);
  });

  console.log("[news-cron] Cron jobs registered");
}
