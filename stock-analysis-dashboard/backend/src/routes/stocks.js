import { Router } from "express";

const router = Router();

// Search stocks by ticker or name
// GET /api/stocks/search?q=AAPL
router.get("/search", async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.json({ results: [] });
    }
    // TODO: implement stock search service (#33)
    res.json({ results: [], query: q });
  } catch (err) {
    next(err);
  }
});

// Get trending stocks
// GET /api/stocks/trending
router.get("/trending", async (_req, res, next) => {
  try {
    // TODO: implement trending service (#33)
    res.json({ trending: [] });
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
    res.json({ ticker: ticker.toUpperCase(), message: "Not implemented yet" });
  } catch (err) {
    next(err);
  }
});

// Get historical prices
// GET /api/stocks/:ticker/prices?range=1Y
router.get("/:ticker/prices", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { range = "1Y" } = req.query;
    // TODO: implement price history service (#33)
    res.json({ ticker: ticker.toUpperCase(), range, prices: [] });
  } catch (err) {
    next(err);
  }
});

export default router;
