import { Router } from "express";

const router = Router();

// Chat with AI about a stock
// POST /api/ai/:ticker/chat
// Body: { message, history }
// Response: streaming text
router.post("/:ticker/chat", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        error: { message: "message is required" },
      });
    }

    // TODO: implement Groq streaming chat (#36)
    // Set headers for streaming response
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Transfer-Encoding", "chunked");

    res.write("AI chat not yet implemented for " + ticker.toUpperCase() + ". See issue #36.");
    res.end();
  } catch (err) {
    next(err);
  }
});

// Get AI summary for a stock
// GET /api/ai/:ticker/summary
router.get("/:ticker/summary", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    // TODO: implement AI summary (#36)
    res.json({ summary: null, ticker: ticker.toUpperCase() });
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
