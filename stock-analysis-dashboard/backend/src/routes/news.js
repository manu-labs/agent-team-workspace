import { Router } from "express";

const router = Router();

// Get latest market news (main feed)
// GET /api/news?limit=20&offset=0
router.get("/", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || "20", 10);
    const offset = parseInt(req.query.offset || "0", 10);
    // TODO: implement news service (#35)
    res.json({ news: [], limit, offset, total: 0 });
  } catch (err) {
    next(err);
  }
});

// Get trending news
// GET /api/news/trending
router.get("/trending", async (_req, res, next) => {
  try {
    // TODO: implement trending news (#35)
    res.json({ news: [] });
  } catch (err) {
    next(err);
  }
});

// Get news for a specific stock
// GET /api/news/:ticker
router.get("/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    // TODO: implement stock-specific news (#35)
    res.json({ ticker: ticker.toUpperCase(), news: [] });
  } catch (err) {
    next(err);
  }
});

export default router;
