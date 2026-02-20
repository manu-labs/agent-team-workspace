# StockPulse — US Stock Analysis Dashboard

Real-time US stock analysis with AI-powered earnings insights. Browse trending stocks, track favorites, read earnings reports, and ask questions about any stock using Groq AI.

## Features

- **Main Dashboard** — news feed, trending stocks, favorites, upcoming earnings
- **Stock Detail Pages** — price charts, earnings history, company profile
- **AI Earnings Insights** — Groq-powered summaries and Q&A for every earnings report
- **Search** — search all US-listed stocks (NYSE + NASDAQ)
- **Favorites** — track your watchlist

## Tech Stack

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Database:** SQLite (via better-sqlite3)
- **AI:** Groq SDK (llama-3.3-70b-versatile)
- **Data Sources:** Yahoo Finance, SEC EDGAR, Finnhub, NewsAPI

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** TailwindCSS
- **Charts:** Recharts
- **Routing:** React Router

## Getting Started

### Backend
```bash
cd stock-analysis-dashboard/backend
cp .env.example .env
# Edit .env with your API keys
npm install
npm run dev
```

The API runs on `http://localhost:3001`.

### Frontend
```bash
cd stock-analysis-dashboard/frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` with proxy to backend.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/stocks/search?q= | Search stocks → `{ results: [] }` |
| GET | /api/stocks/:ticker | Stock profile + quote |
| GET | /api/stocks/:ticker/prices?range= | Price history |
| GET | /api/stocks/trending | Trending stocks → `{ trending: [] }` |
| GET | /api/favorites | User favorites → `{ favorites: [] }` |
| POST | /api/favorites/:ticker | Add favorite |
| DELETE | /api/favorites/:ticker | Remove favorite |
| GET | /api/earnings/upcoming | Upcoming earnings |
| GET | /api/earnings/:ticker | Earnings history |
| GET | /api/earnings/:ticker/:date | Earnings report detail |
| GET | /api/earnings/:ticker/:date/transcript | Earnings transcript |
| GET | /api/news?limit=20&offset=0 | Market news → `{ news: [], total }` |
| GET | /api/news/:ticker | Stock-specific news |
| GET | /api/news/trending | Trending news |
| POST | /api/ai/chat | AI Q&A (SSE streaming) |
| GET | /api/ai/insights/:ticker/:date | Cached AI insights |
| POST | /api/ai/insights/:ticker/:date/generate | Generate AI insights |

## Environment Variables

See `backend/.env.example` for all configuration options.

Required:
- `GROQ_API_KEY` — Groq API key for AI features

Optional (free tiers available):
- `FINNHUB_API_KEY` — Financial news
- `NEWS_API_KEY` — General news search
- `ALPHA_VANTAGE_API_KEY` — Backup price data
