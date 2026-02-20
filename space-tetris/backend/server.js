import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb, getDb } from "./src/db/index.js";
import authRoutes from "./src/routes/auth.js";
import scoreRoutes from "./src/routes/scores.js";
import leaderboardRoutes from "./src/routes/leaderboard.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT 1 as ok").get();
    res.json({
      status: "ok",
      db: row && row.ok === 1 ? "connected" : "error",
      uptime: Math.floor(process.uptime()),
    });
  } catch (err) {
    res.status(503).json({ status: "error", db: "disconnected", error: err.message });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// Initialize DB and start
initDb();
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Space Tetris API running on http://0.0.0.0:${PORT}`);
});
