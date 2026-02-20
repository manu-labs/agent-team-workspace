# StockPulse — US Stock Analysis Dashboard

A full-stack stock analysis dashboard with earnings reports, AI-powered insights, news aggregation, and real-time market data.

## Tech Stack

### Frontend
- **React 18** + **Vite** (fast dev server, ESM-native)
- **TailwindCSS** (utility-first, dark mode built-in)
- **React Router v6** (nested routes)
- **Recharts** (interactive stock price + EPS charts)
- **Zustand** (lightweight state management)

### Backend
- **Node.js 20+** + **Express**
- **SQLite** (via better-sqlite3, WAL mode)
- **Groq SDK** (llama-3.3-70b-versatile for AI features)

### Data Sources
- Yahoo Finance API (stock prices, quotes, search)
- SEC EDGAR (earnings reports, filings, transcripts)
- Finnhub (company and market news)
- NewsAPI (general financial news search)

## Getting Started

### Frontend
```bash
cd stock-analysis-dashboard/frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Backend
```bash
cd stock-analysis-dashboard/backend
cp .env.example .env  # Add your API keys
npm install
npm run dev
# API runs at http://localhost:3001
```

## Project Structure
```
stock-analysis-dashboard/
├── frontend/           # React + Vite app
│   └── src/
│       ├── components/ # Shared UI components
│       ├── pages/      # Route page components
│       ├── hooks/      # Custom React hooks
│       ├── services/   # API client
│       ├── stores/     # Zustand state stores
│       └── styles/     # Tailwind + global CSS
├── backend/            # Node.js + Express API
│   ├── server.js       # Entry point
│   └── src/
│       ├── routes/     # API route handlers
│       ├── services/   # Business logic + data fetching
│       ├── middleware/  # Error handling, rate limiting
│       └── db/         # SQLite schema + initialization
├── .env.example
└── README.md
```

## Routes
| Path | Page |
|------|------|
| `/` | Main dashboard (trending, favorites, news, earnings calendar) |
| `/stock/:ticker` | Stock detail (chart, stats, earnings, AI chat) |
| `/stock/:ticker/earnings/:date` | Individual earnings report |

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stocks/search?q=` | Search stocks |
| GET | `/api/stocks/trending` | Trending stocks |
| GET | `/api/stocks/:ticker` | Stock quote + profile |
| GET | `/api/stocks/:ticker/prices?range=` | Price history |
| GET | `/api/earnings/upcoming` | Upcoming earnings |
| GET | `/api/earnings/:ticker` | Earnings history |
| GET | `/api/earnings/:ticker/:date` | Earnings report detail |
| GET | `/api/earnings/:ticker/:date/transcript` | Earnings transcript |
| GET | `/api/news?limit=20&offset=0` | News feed |
| GET | `/api/news/:ticker` | Stock-specific news |
| GET | `/api/news/trending` | Trending news |
| POST | `/api/ai/chat` | AI Q&A (SSE streaming) |
| GET | `/api/ai/insights/:ticker/:date` | Cached AI insights |
| GET | `/api/favorites` | User favorites |
| POST | `/api/favorites/:ticker` | Add favorite |
| DELETE | `/api/favorites/:ticker` | Remove favorite |

## Environment Variables

See `backend/.env.example` for all configuration options.

Required:
- `GROQ_API_KEY` — Groq API key for AI features

Optional (free tiers available):
- `FINNHUB_API_KEY` — Financial news
- `NEWS_API_KEY` — General news search
