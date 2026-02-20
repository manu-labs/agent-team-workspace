/**
 * Groq AI service — earnings insights and stock Q&A.
 *
 * Uses groq-sdk with llama-3.3-70b-versatile for fast inference.
 * Builds context from stock data, earnings, news, and prices.
 * Supports streaming responses via SSE.
 *
 * Implements: #36
 */

import Groq from "groq-sdk";
import { getDb } from "../db/index.js";

let groqClient;

function getGroq() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set. Add it to your .env file.");
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

const MODEL = "llama-3.3-70b-versatile";
const MAX_TRANSCRIPT_CHARS = parseInt(
  process.env.TRANSCRIPT_MAX_CHARS || "30000",
  10
);

// ---------------------------------------------------------------------------
// Context Builder
// ---------------------------------------------------------------------------

/**
 * Build context for AI prompt from all available data sources.
 * Assembles company profile, earnings, transcripts, prices, and news.
 */
export async function buildContext(ticker, contextType = "general") {
  const db = getDb();
  const t = ticker.toUpperCase();
  const parts = [];

  // 1. Company profile
  const stock = db
    .prepare("SELECT * FROM stocks WHERE ticker = ?")
    .get(t);
  if (stock) {
    const mcap = stock.market_cap
      ? "$" + (stock.market_cap / 1e9).toFixed(1) + "B"
      : "N/A";
    parts.push(
      [
        "## Company Profile",
        `- Name: ${stock.name}`,
        `- Sector: ${stock.sector || "N/A"}`,
        `- Industry: ${stock.industry || "N/A"}`,
        `- Market Cap: ${mcap}`,
        `- Exchange: ${stock.exchange || "N/A"}`,
      ].join("\n")
    );
  }

  // 2. Recent earnings (up to 8 quarters)
  const earnings = db
    .prepare(
      "SELECT * FROM earnings WHERE ticker = ? ORDER BY report_date DESC LIMIT 8"
    )
    .all(t);
  if (earnings.length > 0) {
    const rows = earnings.map((e) => {
      const surprise =
        e.eps_surprise != null
          ? (e.eps_surprise * 100).toFixed(1) + "%"
          : "N/A";
      const revActual =
        e.revenue_actual != null
          ? "$" + (e.revenue_actual / 1e9).toFixed(2) + "B"
          : "N/A";
      return `- ${e.report_date}: EPS est ${e.eps_estimate ?? "N/A"} / actual ${e.eps_actual ?? "N/A"} (surprise ${surprise}), Revenue ${revActual}`;
    });
    parts.push(`## Recent Earnings (${earnings.length} quarters)\n${rows.join("\n")}`);
  }

  // 3. Earnings transcript (for earnings-specific context)
  if (contextType === "earnings") {
    const transcript = db
      .prepare(
        "SELECT content FROM earnings_transcripts WHERE ticker = ? ORDER BY report_date DESC LIMIT 1"
      )
      .get(t);
    if (transcript) {
      parts.push(
        `## Latest Earnings Filing (excerpt)\n${transcript.content.slice(0, MAX_TRANSCRIPT_CHARS)}`
      );
    }
  }

  // 4. Recent price action (last 30 trading days)
  const prices = db
    .prepare(
      "SELECT date, close, volume FROM prices WHERE ticker = ? ORDER BY date DESC LIMIT 30"
    )
    .all(t);
  if (prices.length > 0) {
    const latest = prices[0];
    const oldest = prices[prices.length - 1];
    const pctChange =
      oldest.close > 0
        ? (((latest.close - oldest.close) / oldest.close) * 100).toFixed(1)
        : "N/A";
    parts.push(
      [
        `## Recent Price Action (${prices.length} trading days)`,
        `- Latest: $${latest.close.toFixed(2)} on ${latest.date}`,
        `- ${prices.length}-day change: ${pctChange}%`,
        `- Volume range: ${Math.min(...prices.map((p) => p.volume)).toLocaleString()} - ${Math.max(...prices.map((p) => p.volume)).toLocaleString()}`,
      ].join("\n")
    );
  }

  // 5. Recent news headlines
  const news = db
    .prepare(
      `SELECT n.title, n.published_at, n.publisher FROM news n
       JOIN news_tickers nt ON n.id = nt.news_id
       WHERE nt.ticker = ?
       ORDER BY n.published_at DESC LIMIT 10`
    )
    .all(t);
  if (news.length > 0) {
    const rows = news.map(
      (n) =>
        `- [${n.published_at ? n.published_at.slice(0, 10) : "recent"}] ${n.title} (${n.publisher || "unknown"})`
    );
    parts.push(`## Recent News\n${rows.join("\n")}`);
  }

  if (parts.length === 0) {
    return `Stock: ${t}\nNo data available yet. Data services may not have populated information for this ticker.`;
  }

  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Streaming Chat
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT_TEMPLATE = `You are StockPulse AI, a financial analysis assistant. You have access to the following data about {TICKER}:

{CONTEXT}

Instructions:
- Provide clear, data-driven analysis
- Cite specific numbers from the data when available
- If data is missing or insufficient, say so rather than guessing
- Format responses with markdown for readability
- Keep responses focused and concise`;

/**
 * Stream a chat response from Groq via SSE.
 * @param {string} ticker
 * @param {string} question
 * @param {string} contextType - "earnings", "general", or "comparison"
 * @param {function} onChunk - callback for each streamed text chunk
 */
export async function streamChat(ticker, question, contextType, onChunk) {
  const groq = getGroq();
  const context = await buildContext(ticker, contextType);

  const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace("{TICKER}", ticker.toUpperCase()).replace(
    "{CONTEXT}",
    context
  );

  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    stream: true,
    max_tokens: 2048,
    temperature: 0.3,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      onChunk(content);
    }
  }
}

// ---------------------------------------------------------------------------
// Earnings Insights (cached)
// ---------------------------------------------------------------------------

/**
 * Generate AI earnings insights for a specific report. Results are cached for 24h.
 */
export async function generateEarningsInsights(ticker, date) {
  const groq = getGroq();
  const db = getDb();
  const t = ticker.toUpperCase();
  const cacheKey = `insights:${t}:${date}`;

  // Check cache first (only return if not expired)
  const cached = db
    .prepare(
      "SELECT * FROM ai_cache WHERE cache_key = ? AND expires_at > datetime('now')"
    )
    .get(cacheKey);
  if (cached) return JSON.parse(cached.response);

  // Gather earnings data for context
  const report = db
    .prepare("SELECT * FROM earnings WHERE ticker = ? AND report_date = ?")
    .get(t, date);

  const transcript = db
    .prepare(
      "SELECT content FROM earnings_transcripts WHERE ticker = ? AND report_date = ?"
    )
    .get(t, date);

  const contextParts = [];

  if (report) {
    const surprise =
      report.eps_surprise != null
        ? (report.eps_surprise * 100).toFixed(1) + "%"
        : "N/A";
    contextParts.push(
      [
        `Earnings Report: ${t} on ${date}`,
        `EPS: estimated ${report.eps_estimate ?? "N/A"}, actual ${report.eps_actual ?? "N/A"}, surprise ${surprise}`,
        `Revenue: estimated $${report.revenue_estimate || "N/A"}, actual $${report.revenue_actual || "N/A"}`,
        `Status: ${report.status}`,
      ].join("\n")
    );
  }

  if (transcript) {
    contextParts.push(
      `Filing text (excerpt):\n${transcript.content.slice(0, 40000)}`
    );
  }

  // Also add recent price context around the earnings date
  const pricesAround = db
    .prepare(
      `SELECT date, close FROM prices WHERE ticker = ?
       AND date BETWEEN date(?, '-7 days') AND date(?, '+7 days')
       ORDER BY date`
    )
    .all(t, date, date);
  if (pricesAround.length > 0) {
    contextParts.push(
      `Price around earnings date:\n${pricesAround.map((p) => `${p.date}: $${p.close.toFixed(2)}`).join(", ")}`
    );
  }

  const analysisPrompt = `Analyze the following earnings data and provide:
1. A 2-3 sentence executive summary
2. 3-5 key takeaways with specific numbers
3. Notable risks or concerns mentioned
4. Outlook and expectations for next quarter

Be specific and cite numbers from the data.`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a senior financial analyst. Provide thorough, data-driven analysis of earnings reports. Always cite specific numbers.",
      },
      {
        role: "user",
        content: `${contextParts.join("\n\n") || "No earnings data available for this date."}\n\n${analysisPrompt}`,
      },
    ],
    max_tokens: 1500,
    temperature: 0.3,
  });

  const insights = {
    ticker: t,
    date,
    summary:
      response.choices[0]?.message?.content ||
      "Unable to generate insights — no response from AI model.",
    generated_at: new Date().toISOString(),
  };

  // Cache for 24 hours
  db.prepare(
    `INSERT INTO ai_cache (cache_key, ticker, prompt_type, response, expires_at)
     VALUES (?, ?, 'earnings_insights', ?, datetime('now', '+24 hours'))
     ON CONFLICT(cache_key) DO UPDATE SET
       response = excluded.response, expires_at = excluded.expires_at`
  ).run(cacheKey, t, JSON.stringify(insights));

  return insights;
}

/**
 * Get cached insights for an earnings report.
 */
export async function getCachedInsights(ticker, date) {
  const db = getDb();
  const cacheKey = `insights:${ticker.toUpperCase()}:${date}`;
  const row = db
    .prepare(
      "SELECT * FROM ai_cache WHERE cache_key = ? AND expires_at > datetime('now')"
    )
    .get(cacheKey);
  return row ? JSON.parse(row.response) : null;
}
