import type { Match, PriceSnapshot, Market, MatchFilters, MarketFilters } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}/api/v1${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") {
        url.searchParams.set(k, v);
      }
    });
  }

  const res = await fetch(url.toString(), {
    headers: { "Content-Type": "application/json" },
  });

  if (res.ok === false) {
    const body = await res.text();
    throw new ApiError(body || res.statusText, res.status);
  }

  return res.json();
}

// ── Backend response shape (differs from frontend Match type) ─────────────────

interface BackendMatch {
  id: string;
  question: string;
  polymarket_yes: number;
  kalshi_yes: number;
  spread: number;
  fee_adjusted_spread: number;
  direction: "buy_kalshi_sell_poly" | "buy_poly_sell_kalshi";
  polymarket_volume: number;
  kalshi_volume: number;
  polymarket_end_date: string;
  kalshi_end_date: string;
  polymarket_url: string;
  kalshi_url: string;
  confidence: number;
  last_updated: string;
}

/**
 * Normalize a backend match response to the frontend Match type.
 * - Renames fields (e.g. polymarket_yes → poly_yes)
 * - Computes missing fields (poly_no, kalshi_no)
 * - Derives volume as min(polymarket_volume, kalshi_volume)
 * - Picks the earlier of the two end dates
 */
function normalizeMatch(raw: BackendMatch): Match {
  const endDate =
    raw.polymarket_end_date < raw.kalshi_end_date
      ? raw.polymarket_end_date
      : raw.kalshi_end_date;

  return {
    id: raw.id,
    question: raw.question,
    poly_yes: raw.polymarket_yes,
    poly_no: 1 - raw.polymarket_yes,
    kalshi_yes: raw.kalshi_yes,
    kalshi_no: 1 - raw.kalshi_yes,
    raw_spread: raw.spread,
    fee_adjusted_spread: raw.fee_adjusted_spread,
    direction: raw.direction,
    volume: Math.min(raw.polymarket_volume, raw.kalshi_volume),
    end_date: endDate,
    poly_url: raw.polymarket_url,
    kalshi_url: raw.kalshi_url,
    confidence: raw.confidence,
    last_updated: raw.last_updated,
  };
}

/** Fetch all matched market pairs, sorted by fee-adjusted spread */
export async function getMatches(filters?: MatchFilters): Promise<Match[]> {
  const params: Record<string, string> = {};
  if (filters?.min_spread !== undefined) params.min_spread = String(filters.min_spread);
  if (filters?.sort) params.sort = filters.sort;
  if (filters?.direction) params.direction = filters.direction;
  const raw = await request<BackendMatch[]>("/matches", params);
  return raw.map(normalizeMatch);
}

/** Fetch a single match by ID */
export async function getMatch(matchId: string): Promise<Match> {
  const raw = await request<BackendMatch>(`/matches/${matchId}`);
  return normalizeMatch(raw);
}

/** Fetch price history for a match */
export async function getMatchHistory(
  matchId: string,
  hours?: number
): Promise<PriceSnapshot[]> {
  const params: Record<string, string> = {};
  if (hours !== undefined) params.hours = String(hours);
  return request<PriceSnapshot[]>(`/matches/${matchId}/history`, params);
}

/** Fetch markets from one or both platforms */
export async function getMarkets(filters?: MarketFilters): Promise<Market[]> {
  const params: Record<string, string> = {};
  if (filters?.platform) params.platform = filters.platform;
  if (filters?.category) params.category = filters.category;
  return request<Market[]>("/markets", params);
}
