# Auto-RSVP Frontend

Next.js 14 web app for automatically signing up for SXSW 2026 events.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: Typed fetch client pointing to the FastAPI backend

## Setup

```bash
cd auto-rsvp/frontend

# Install dependencies
npm install

# Copy env file and set backend URL
cp .env.local.example .env.local

# Start dev server
npm run dev
```

The app runs at `http://localhost:3000` by default.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000` |

## Project Structure

```
src/
  app/              # Next.js App Router pages
    layout.tsx      # Root layout (NavBar + Footer)
    page.tsx        # Landing page
    signup/         # User signup + onboarding (#155)
    events/         # Event browser (#156)
    dashboard/      # RSVP dashboard (#157)
    settings/       # Profile settings (#158)
  components/       # React components
    NavBar.tsx      # Top navigation bar
    Footer.tsx      # Page footer
    EventCard.tsx   # Event display card with match score
    RSVPStatusBadge.tsx  # Color-coded RSVP status pill
  lib/
    api.ts          # Typed API client for backend
    types.ts        # TypeScript interfaces (User, Event, RSVP)
  styles/
    globals.css     # Tailwind CSS imports
```

## API Client

All backend calls go through `src/lib/api.ts`. Import functions directly:

```tsx
import { getEvents, createUser, getRSVPs } from "@/lib/api";
```

The client handles JSON serialization, error responses (throws `ApiError` with status code), and base URL configuration via env var.

## Conventions

- **Dark theme**: zinc-950 background, zinc-100 text
- **Components**: default exports, PascalCase filenames
- **Pages**: App Router file-based routing
- **User state**: localStorage for MVP (no auth server)
- **Styling**: Tailwind utility classes, no CSS modules
