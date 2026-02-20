import { Router } from "express";
import {
  getUpcomingEarnings,
  getEarningsHistory,
  getEarningsReport,
  getTranscript,
  refreshEarnings,
} from "../services/earnings-service.js";

const router = Router();

// GET /api/earnings/upcoming?days=14
router.get("/upcoming", async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days || "14", 10), 90);
    const upcoming = await getUpcomingEarnings(days);
    res.json({ upcoming, days });
  } catch (err) {
    next(err);
  }
});

// GET /api/earnings/:ticker
router.get("/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const earnings = await getEarningsHistory(ticker);
    res.json({ ticker: ticker.toUpperCase(), earnings });
  } catch (err) {
    next(err);
  }
});

// GET /api/earnings/:ticker/:date
router.get("/:ticker/:date", async (req, res, next) => {
  try {
    const { ticker, date } = req.params;
    const report = await getEarningsReport(ticker, date);
    if (\!report) {
      return res.status(404).json({ error: "Earnings report not found" });
    }
    res.json({ ticker: ticker.toUpperCase(), date, report });
  } catch (err) {
    next(err);
  }
});

// GET /api/earnings/:ticker/:date/transcript
router.get("/:ticker/:date/transcript", async (req, res, next) => {
  try {
    const { ticker, date } = req.params;
    const transcript = await getTranscript(ticker, date);
    if (\!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }
    res.json({ ticker: ticker.toUpperCase(), date, transcript });
  } catch (err) {
    next(err);
  }
});

// POST /api/earnings/refresh/:ticker
router.post("/refresh/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    // Run async — return immediately, scrape in background
    refreshEarnings(ticker).then((result) => {
      console.log("Earnings refresh complete:", result);
    }).catch((err) => {
      console.error("Earnings refresh failed:", err);
    });
    res.json({ ticker: ticker.toUpperCase(), message: "Refresh started" });
  } catch (err) {
    next(err);
  }
});

export default router;

