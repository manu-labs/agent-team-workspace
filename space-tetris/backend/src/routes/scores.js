import { Router } from "express";
import { getDb } from "../db/index.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

// POST /api/scores — submit a new score
router.post("/", authRequired, (req, res) => {
  try {
    const { score, lines_cleared, level, duration_seconds } = req.body;

    if (typeof score !== "number" || score < 0) {
      return res.status(400).json({ error: "Valid score is required" });
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO scores (user_id, score, lines_cleared, level, duration_seconds)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        req.user.id,
        score,
        lines_cleared || 0,
        level || 1,
        duration_seconds || 0
      );

    // Compute the rank of this score
    const { rank } = db
      .prepare("SELECT COUNT(*) + 1 as rank FROM scores WHERE score > ?")
      .get(score);

    res.status(201).json({ id: result.lastInsertRowid, score, rank });
  } catch (err) {
    console.error("[scores] Submit error:", err.message);
    res.status(500).json({ error: "Score submission failed" });
  }
});

// GET /api/scores/me — current user's top scores
router.get("/me", authRequired, (req, res) => {
  try {
    const db = getDb();
    const scores = db
      .prepare(
        `SELECT id, score, lines_cleared, level, duration_seconds, created_at
         FROM scores WHERE user_id = ? ORDER BY score DESC LIMIT 20`
      )
      .all(req.user.id);

    res.json({ scores });
  } catch (err) {
    console.error("[scores] Fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

export default router;
