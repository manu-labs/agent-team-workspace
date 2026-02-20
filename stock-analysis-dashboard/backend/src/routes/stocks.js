import { Router } from "express";
import {
  searchStocks,
  getStockProfile,
  getStockPrices,
  getTrendingStocks,
} from "../services/stock-service.js";

const router = Router();

// Search stocks by ticker or name
// GET /api/stocks/search?q=AAPL
router.get("/search", async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.json({ results: [] });
    }
    const results = await searchStocks(q);
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

// Get trending stocks
// GET /api/stocks/trending
router.get("/trending", async (_req, res, next) => {
  try {
    const trending = await getTrendingStocks();
    res.json({ trending });
  } catch (err) {
    next(err);
  }
});

// Get full stock profile + latest price
// GET /api/stocks/:ticker
router.get("/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const profile = await getStockProfile(ticker);
    if (!profile) {
      return res.status(404).json({ error: "Stock not found" });
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// Get historical prices / chart data
// GET /api/stocks/:ticker/prices?range=1M
router.get("/:ticker/prices", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { range = "1M" } = req.query;
    const prices = await getStockPrices(ticker, range);
    res.json({ ticker: ticker.toUpperCase(), range, prices });
  } catch (err) {
    next(err);
  }
});

export default router;
