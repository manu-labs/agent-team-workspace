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
- **Node.js** + **Express**
- **SQLite** (via better-sqlite3)
- **Groq AI** (earnings insights + Q&A chat)

### Data Sources
- Yahoo Finance API (stock prices, quotes)
- SEC EDGAR (earnings reports, filings)
- Financial news APIs

## Getting Started

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### Backend
```bash
cd backend
npm install
cp ../.env.example .env  # Add your GROQ_API_KEY
npm run dev
# API runs at http://localhost:4000
```

## Project Structure
```
stock-analysis-dashboard/
+-- frontend/           # React + Vite app
|   +-- src/
|   |   +-- components/ # Shared UI components
|   |   +-- pages/      # Route page components
|   |   +-- hooks/      # Custom React hooks
|   |   +-- services/   # API client
|   |   +-- stores/     # Zustand state stores
|   |   +-- styles/     # Tailwind + global CSS
+-- backend/            # Node.js + Express API
|   +-- src/
|   |   +-- routes/     # API route handlers
|   |   +-- services/   # Business logic
|   |   +-- models/     # Database models
+-- .env.example
+-- README.md
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
| GET | `/api/stocks/:ticker` | Stock quote |
| GET | `/api/stocks/:ticker/chart?range=` | Price history |
| GET | `/api/earnings/upcoming` | Upcoming earnings |
| GET | `/api/earnings/:ticker` | Earnings history |
| GET | `/api/earnings/:ticker/:date` | Earnings report |
| GET | `/api/news` | News feed |
| GET | `/api/news/:ticker` | Stock-specific news |
| POST | `/api/ai/:ticker/chat` | AI chat (streaming) |
| GET | `/api/ai/:ticker/summary` | AI earnings summary |
| GET | `/api/favorites` | User favorites |
| POST | `/api/favorites` | Add favorite |
| DELETE | `/api/favorites/:ticker` | Remove favorite |
