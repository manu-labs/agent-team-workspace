import { Router } from "express";

const router = Router();

// Get upcoming earnings
// GET /api/earnings/upcoming?days=14
router.get("/upcoming", async (req, res, next) => {
  try {
    const days = parseInt(req.query.days || "14", 10);
    // TODO: implement earnings calendar service (#34)
    res.json({ upcoming: [], days });
  } catch (err) {
    next(err);
  }
});

// Get all earnings history for a stock
// GET /api/earnings/:ticker
router.get("/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    // TODO: implement earnings history service (#34)
    res.json({ ticker: ticker.toUpperCase(), earnings: [] });
  } catch (err) {
    next(err);
  }
});

// Get specific earnings report details
// GET /api/earnings/:ticker/:date
router.get("/:ticker/:date", async (req, res, next) => {
  try {
    const { ticker, date } = req.params;
    // TODO: implement earnings detail service (#34)
    res.json({ ticker: ticker.toUpperCase(), date, report: null });
  } catch (err) {
    next(err);
  }
});

// Get full transcript text
// GET /api/earnings/:ticker/:date/transcript
router.get("/:ticker/:date/transcript", async (req, res, next) => {
  try {
    const { ticker, date } = req.params;
    // TODO: implement transcript service (#34)
    res.json({ ticker: ticker.toUpperCase(), date, transcript: null });
  } catch (err) {
    next(err);
  }
});

// Trigger a rescrape for a stock
// POST /api/earnings/refresh/:ticker
router.post("/refresh/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    // TODO: implement earnings refresh (#34)
    res.json({ ticker: ticker.toUpperCase(), message: "Refresh queued" });
  } catch (err) {
    next(err);
  }
});

export default router;

