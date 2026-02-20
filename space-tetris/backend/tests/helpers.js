import express from "express";
import { getDb } from "../src/db/index.js";
import authRoutes from "../src/routes/auth.js";
import scoreRoutes from "../src/routes/scores.js";
import leaderboardRoutes from "../src/routes/leaderboard.js";

/** Create a test Express app wired to the same routes as production, no listen() call. */
export function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/scores", scoreRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);
  return app;
}

/** Wipe all rows between tests for isolation. */
export function clearDb() {
  const db = getDb();
  db.prepare("DELETE FROM scores").run();
  db.prepare("DELETE FROM users").run();
}

/** Insert a score row directly (bypasses API) — useful for setting custom timestamps. */
export function insertScoreDirectly({
  userId,
  score,
  lines_cleared = 0,
  level = 1,
  duration_seconds = 0,
  created_at = null,
}) {
  const db = getDb();
  if (created_at) {
    db.prepare(
      "INSERT INTO scores (user_id, score, lines_cleared, level, duration_seconds, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(userId, score, lines_cleared, level, duration_seconds, created_at);
  } else {
    db.prepare(
      "INSERT INTO scores (user_id, score, lines_cleared, level, duration_seconds) VALUES (?, ?, ?, ?, ?)"
    ).run(userId, score, lines_cleared, level, duration_seconds);
  }
}
