import { Router } from "express";

const router = Router();

// Search stocks by ticker or name
// GET /api/stocks/search?q=AAPL
router.get("/search", async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.json([]);
    }
    // TODO: implement stock search service (#33)
    // Frontend expects: { ticker, name, sector, price }[]
    res.json([]);
  } catch (err) {
    next(err);
  }
});

// Get trending stocks
// GET /api/stocks/trending
router.get("/trending", async (_req, res, next) => {
  try {
    // TODO: implement trending service (#33)
    // Frontend expects: { ticker, name, price, change, changePercent }[]
    res.json([]);
  } catch (err) {
    next(err);
  }
});

// Get full stock profile + latest price
// GET /api/stocks/:ticker
router.get("/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    // TODO: implement stock profile service (#33)
    // Frontend expects: { ticker, name, price, change, changePercent, marketCap, pe, high52w, low52w, volume, avgVolume, dividendYield, beta }
    res.json({ ticker: ticker.toUpperCase() });
  } catch (err) {
    next(err);
  }
});

// Get chart data (historical prices)
// GET /api/stocks/:ticker/chart?range=1M
router.get("/:ticker/chart", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { range = "1M" } = req.query;
    // TODO: implement chart data service (#33)
    // Frontend expects: { date, price }[]
    res.json([]);
  } catch (err) {
    next(err);
  }
});

export default router;
