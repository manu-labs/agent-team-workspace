import { Router } from "express";
import {
  streamChat,
  getCachedInsights,
  generateEarningsInsights,
} from "../services/ai-service.js";

const router = Router();

// Chat with AI about a stock (streaming SSE)
// POST /api/ai/chat
// Body: { ticker, question, context_type }
router.post("/chat", async (req, res, next) => {
  try {
    const { ticker, question, context_type = "general" } = req.body;

    if (!ticker || !question) {
      return res
        .status(400)
        .json({ error: { message: "ticker and question are required" } });
    }

    // Set SSE headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    res.write(`data: ${JSON.stringify({ type: "start" })}\n\n`);

    try {
      await streamChat(ticker, question, context_type, (text) => {
        res.write(`data: ${JSON.stringify({ type: "content", text })}\n\n`);
      });
    } catch (err) {
      const isApiKeyError =
        err.message && err.message.includes("GROQ_API_KEY");
      const errorMsg = isApiKeyError
        ? "AI service is not configured. Please set GROQ_API_KEY in your .env file."
        : "An error occurred while generating the response. Please try again.";
      res.write(
        `data: ${JSON.stringify({ type: "error", message: errorMsg })}\n\n`
      );
      console.error("[ai] Chat stream error:", err.message);
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    // If headers haven't been sent yet, pass to error handler
    if (!res.headersSent) {
      next(err);
    } else {
      res.end();
    }
  }
});

// Get cached AI insights for an earnings report
// GET /api/ai/insights/:ticker/:date
router.get("/insights/:ticker/:date", async (req, res, next) => {
  try {
    const { ticker, date } = req.params;
    const insights = await getCachedInsights(ticker, date);
    if (!insights) {
      return res.json({
        ticker: ticker.toUpperCase(),
        date,
        insights: null,
        message: "No cached insights. POST to /generate to create them.",
      });
    }
    res.json(insights);
  } catch (err) {
    next(err);
  }
});

// Trigger AI summary generation for an earnings report
// POST /api/ai/insights/:ticker/:date/generate
router.post("/insights/:ticker/:date/generate", async (req, res, next) => {
  try {
    const { ticker, date } = req.params;

    // Run generation in background, return immediately
    generateEarningsInsights(ticker, date)
      .then((result) => {
        console.log(
          `[ai] Insights generated for ${ticker}/${date}:`,
          result.generated_at
        );
      })
      .catch((err) => {
        console.error(`[ai] Insights generation failed for ${ticker}/${date}:`, err.message);
      });

    res.json({
      ticker: ticker.toUpperCase(),
      date,
      message: "Generation started. GET /insights/:ticker/:date to check results.",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
