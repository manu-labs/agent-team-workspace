import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb, getDb } from "./src/db/index.js";
import { errorHandler } from "./src/middleware/error-handler.js";
import { rateLimiter } from "./src/middleware/rate-limiter.js";
import stockRoutes from "./src/routes/stocks.js";
import earningsRoutes from "./src/routes/earnings.js";
import newsRoutes from "./src/routes/news.js";
import favoritesRoutes from "./src/routes/favorites.js";
import aiRoutes from "./src/routes/ai.js";
import { registerStockCronJobs } from "./src/services/stock-cron.js";
import { registerEarningsCronJobs } from "./src/services/earnings-cron.js";
import { registerNewsCronJobs } from "./src/services/news-cron.js";

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow GitHub Pages origin in production, everything in dev
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin:
      corsOrigin === "*"
        ? true
        : corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  })
);

app.use(express.json());
app.use(rateLimiter);

// Routes
app.use("/api/stocks", stockRoutes);
app.use("/api/earnings", earningsRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/ai", aiRoutes);

// Health check with DB connectivity
app.get("/api/health", (_req, res) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT 1 as ok").get();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      db: row && row.ok === 1 ? "connected" : "error",
      uptime: Math.floor(process.uptime()),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      db: "disconnected",
      error: err.message,
    });
  }
});

// Error handling (must be last)
app.use(errorHandler);

// Initialize database and start server
async function start() {
  try {
    initDb();

    // Register scheduled jobs
    registerStockCronJobs();
    registerEarningsCronJobs();
    registerNewsCronJobs();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`StockPulse API running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
