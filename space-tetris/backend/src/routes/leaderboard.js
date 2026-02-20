import { Router } from "express";
import { getDb } from "../db/index.js";

const router = Router();

// GET /api/leaderboard?period=daily|weekly|alltime
router.get("/", (req, res) => {
  try {
    const period = req.query.period || "alltime";
    const db = getDb();

    let dateFilter = "";
    if (period === "daily") {
      dateFilter = "AND s.created_at >= datetime('now', '-1 day')";
    } else if (period === "weekly") {
      dateFilter = "AND s.created_at >= datetime('now', '-7 days')";
    }

    const entries = db
      .prepare(
        `SELECT s.id, s.score, s.lines_cleared, s.level, s.duration_seconds,
                s.created_at, u.username
         FROM scores s
         JOIN users u ON s.user_id = u.id
         WHERE 1=1 ${dateFilter}
         ORDER BY s.score DESC
         LIMIT 100`
      )
      .all();

    // Add rank numbers
    const leaderboard = entries.map((entry, i) => ({
      rank: i + 1,
      ...entry,
    }));

    res.json({ period, leaderboard });
  } catch (err) {
    console.error("[leaderboard] Fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
