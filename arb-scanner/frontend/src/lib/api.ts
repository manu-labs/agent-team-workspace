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

/** Fetch all matched market pairs, sorted by fee-adjusted spread */
export async function getMatches(filters?: MatchFilters): Promise<Match[]> {
  const params: Record<string, string> = {};
  if (filters?.min_spread !== undefined) params.min_spread = String(filters.min_spread);
  if (filters?.sort) params.sort = filters.sort;
  if (filters?.direction) params.direction = filters.direction;
  return request<Match[]>("/matches", params);
}

/** Fetch a single match by ID */
export async function getMatch(matchId: string): Promise<Match> {
  return request<Match>(`/matches/${matchId}`);
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