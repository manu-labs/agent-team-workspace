import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb } from "./src/db/index.js";
import { errorHandler } from "./src/middleware/error-handler.js";
import { rateLimiter } from "./src/middleware/rate-limiter.js";
import stockRoutes from "./src/routes/stocks.js";
import earningsRoutes from "./src/routes/earnings.js";
import newsRoutes from "./src/routes/news.js";
import favoritesRoutes from "./src/routes/favorites.js";
import aiRoutes from "./src/routes/ai.js";
import { registerStockCronJobs } from "./src/services/stock-cron.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimiter);

// Routes
app.use("/api/stocks", stockRoutes);
app.use("/api/earnings", earningsRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/ai", aiRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling (must be last)
app.use(errorHandler);

// Initialize database and start server
async function start() {
  try {
    initDb();

    // Register scheduled jobs (stock price refresh + trending)
    registerStockCronJobs();

    app.listen(PORT, () => {
      console.log(`StockPulse API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
