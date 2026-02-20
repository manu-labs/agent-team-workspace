import { Router } from "express";
import {
  getMarketNews,
  getStockNews,
  getTrendingNews,
} from "../services/news-service.js";

const router = Router();

// GET /api/news?limit=20&offset=0
router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const offset = parseInt(req.query.offset || "0", 10);
    const result = await getMarketNews(limit, offset);
    res.json({ ...result, limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/news/trending
// NOTE: must be declared BEFORE /:ticker to avoid route conflict
router.get("/trending", async (_req, res, next) => {
  try {
    const news = await getTrendingNews();
    res.json({ news });
  } catch (err) {
    next(err);
  }
});

// GET /api/news/:ticker
router.get("/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const news = await getStockNews(ticker);
    res.json({ ticker: ticker.toUpperCase(), news });
  } catch (err) {
    next(err);
  }
});

export default router;

