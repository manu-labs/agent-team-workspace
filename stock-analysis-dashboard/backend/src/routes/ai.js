import { Router } from "express";

const router = Router();

// Chat with AI about a stock
// POST /api/ai/chat
// Body: { ticker, question, context_type }
// Response: streaming SSE
router.post("/chat", async (req, res, next) => {
  try {
    const { ticker, question, context_type = "general" } = req.body;

    if (!ticker || !question) {
      return res.status(400).json({
        error: { message: "ticker and question are required" },
      });
    }

    // TODO: implement Groq streaming chat (#36)
    // Set SSE headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.write(`data: ${JSON.stringify({ type: "start" })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "content", text: "AI chat not yet implemented. See issue #36." })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    next(err);
  }
});

// Get cached AI insights for an earnings report
// GET /api/ai/insights/:ticker/:date
router.get("/insights/:ticker/:date", async (req, res, next) => {
  try {
    const { ticker, date } = req.params;
    // TODO: implement insights cache lookup (#36)
    res.json({ ticker: ticker.toUpperCase(), date, insights: null });
  } catch (err) {
    next(err);
  }
});

// Trigger AI summary generation for an earnings report
// POST /api/ai/insights/:ticker/:date/generate
router.post("/insights/:ticker/:date/generate", async (req, res, next) => {
  try {
    const { ticker, date } = req.params;
    // TODO: implement insights generation (#36)
    res.json({ ticker: ticker.toUpperCase(), date, message: "Generation queued" });
  } catch (err) {
    next(err);
  }
});

export default router;

