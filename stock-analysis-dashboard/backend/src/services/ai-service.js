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

/**
 * Build context for AI prompt from available data sources.
 * @param {string} ticker
 * @param {string} contextType - "earnings", "general", or "comparison"
 */
export async function buildContext(ticker, contextType = "general") {
  // TODO (#36): Assemble context from:
  // 1. Company profile (sector, market cap, description)
  // 2. Recent earnings data (EPS, revenue, surprises)
  // 3. Earnings transcript text (truncated to fit context)
  // 4. Recent price action (last 30 days)
  // 5. Recent news headlines
  return `Stock: ${ticker.toUpperCase()}\nContext type: ${contextType}\n[Context building not yet implemented]`;
}

/**
 * Stream a chat response from Groq.
 * @param {string} ticker
 * @param {string} question
 * @param {string} contextType
 * @param {function} onChunk - callback for each streamed chunk
 */
export async function streamChat(ticker, question, contextType, onChunk) {
  const groq = getGroq();
  const context = await buildContext(ticker, contextType);

  const systemPrompt = `You are StockPulse AI, a financial analysis assistant. You have access to the following data about ${ticker.toUpperCase()}:

${context}

Provide clear, data-driven analysis. Cite specific numbers when available. If data is missing, say so rather than guessing. Format responses with markdown.`;

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

/**
 * Generate and cache earnings insights for a report.
 */
export async function generateEarningsInsights(ticker, date) {
  // TODO (#36): Generate summary + key takeaways, cache in ai_cache table
  return { ticker, date, status: "not_implemented" };
}

/**
 * Get cached insights for an earnings report.
 */
export async function getCachedInsights(ticker, date) {
  const db = getDb();
  const cacheKey = `insights:${ticker.toUpperCase()}:${date}`;
  return db.prepare("SELECT * FROM ai_cache WHERE cache_key = ?").get(cacheKey);
}
