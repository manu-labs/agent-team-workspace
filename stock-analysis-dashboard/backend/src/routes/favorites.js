import { Router } from "express";
import { getDb } from "../db/index.js";
import { getStockProfile } from "../services/stock-service.js";

const router = Router();

// Get user favorites with stock details
// GET /api/favorites
router.get("/", async (_req, res, next) => {
  try {
    const db = getDb();
    const favorites = db
      .prepare(
        `SELECT f.ticker, f.added_at, s.name, s.sector
         FROM favorites f
         LEFT JOIN stocks s ON f.ticker = s.ticker
         WHERE f.user_id = 'default'
         ORDER BY f.added_at DESC`
      )
      .all();
    res.json({ favorites });
  } catch (err) {
    next(err);
  }
});

// Add a favorite
// POST /api/favorites/:ticker
router.post("/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const upperTicker = ticker.toUpperCase();
    const db = getDb();

    // Ensure stock exists in stocks table (required by foreign key)
    const exists = db
      .prepare("SELECT ticker FROM stocks WHERE ticker = ?")
      .get(upperTicker);
    if (!exists) {
      // Fetch from Yahoo to populate stocks table
      try {
        await getStockProfile(upperTicker);
      } catch (err) {
        // Insert a minimal record so the foreign key is satisfied
        db.prepare(
          "INSERT OR IGNORE INTO stocks (ticker, name) VALUES (?, ?)"
        ).run(upperTicker, upperTicker);
      }
    }

    db.prepare(
      "INSERT OR IGNORE INTO favorites (user_id, ticker) VALUES ('default', ?)"
    ).run(upperTicker);

    res.json({ ticker: upperTicker, message: "Added to favorites" });
  } catch (err) {
    next(err);
  }
});

// Remove a favorite
// DELETE /api/favorites/:ticker
router.delete("/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const db = getDb();
    const result = db
      .prepare(
        "DELETE FROM favorites WHERE user_id = 'default' AND ticker = ?"
      )
      .run(ticker.toUpperCase());

    if (result.changes === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }
    res.json({ ticker: ticker.toUpperCase(), message: "Removed from favorites" });
  } catch (err) {
    next(err);
  }
});

export default router;
