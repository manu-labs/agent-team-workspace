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

// Kalshi actuarial fee: min(7% * p * (1-p), $0.02) per contract
// Symmetric — same for YES at p or NO at (1-p)
function kalshiFee(kalshiYes: number): number {
  return Math.min(0.07 * kalshiYes * (1 - kalshiYes), 0.02);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformMatch(raw: any): Match {
  const polyYes = raw.poly_yes ?? raw.polymarket_yes ?? 0;
  const polyNo = raw.poly_no ?? (1 - polyYes);
  const kalshiYes = raw.kalshi_yes ?? 0;
  const kalshiNo = raw.kalshi_no ?? (1 - kalshiYes);
  const polyVolume = raw.poly_volume ?? raw.polymarket_volume ?? 0;
  const kalshiVolume = raw.kalshi_volume ?? 0;

  // Compute spread from live prices: 100 - YES_A - NO_B
  // Pick the direction that gives the best result
  const spreadBuyPoly = 1 - polyYes - kalshiNo;   // Buy YES Poly + Buy NO Kalshi
  const spreadBuyKalshi = 1 - kalshiYes - polyNo;  // Buy YES Kalshi + Buy NO Poly

  let rawSpread: number;
  let direction: "buy_kalshi_sell_poly" | "buy_poly_sell_kalshi";
  if (spreadBuyKalshi >= spreadBuyPoly) {
    rawSpread = spreadBuyKalshi;
    direction = "buy_kalshi_sell_poly";
  } else {
    rawSpread = spreadBuyPoly;
    direction = "buy_poly_sell_kalshi";
  }

  // Fee-adjusted spread: subtract Kalshi actuarial fee
  const fee = kalshiFee(kalshiYes);
  const feeAdjustedSpread = rawSpread - fee;

  return {
    id: String(raw.id),
    question: raw.question,
    poly_yes: polyYes,
    poly_no: polyNo,
    kalshi_yes: kalshiYes,
    kalshi_no: kalshiNo,
    raw_spread: rawSpread,
    fee_adjusted_spread: feeAdjustedSpread,
    direction,
    volume: raw.volume ?? Math.min(polyVolume, kalshiVolume),
    poly_volume: polyVolume,
    kalshi_volume: kalshiVolume,
    end_date: raw.end_date ?? raw.polymarket_end_date ?? raw.kalshi_end_date ?? "",
    poly_url: raw.poly_url ?? raw.polymarket_url ?? "",
    kalshi_url: raw.kalshi_url ?? "",
    confidence: raw.confidence,
    last_updated: raw.last_updated,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformSnapshot(raw: any): PriceSnapshot {
  const polyYes = raw.polymarket_yes ?? raw.poly_yes ?? 0;
  const kalshiYes = raw.kalshi_yes ?? 0;
  const polyNo = raw.poly_no ?? 1 - polyYes;
  const kalshiNo = raw.kalshi_no ?? 1 - kalshiYes;

  // Compute spread from snapshot prices too
  const spreadBuyPoly = 1 - polyYes - kalshiNo;
  const spreadBuyKalshi = 1 - kalshiYes - polyNo;
  const rawSpread = Math.max(spreadBuyPoly, spreadBuyKalshi);
  const fee = kalshiFee(kalshiYes);

  return {
    timestamp: raw.recorded_at || raw.timestamp || "",
    poly_yes: polyYes,
    poly_no: polyNo,
    kalshi_yes: kalshiYes,
    kalshi_no: kalshiNo,
    raw_spread: rawSpread,
    fee_adjusted_spread: rawSpread - fee,
  };
}

/** Fetch all matched market pairs */
export async function getMatches(filters?: MatchFilters): Promise<Match[]> {
  const params: Record<string, string> = {};
  if (filters?.min_spread !== undefined) params.min_spread = String(filters.min_spread);
  if (filters?.min_volume !== undefined && filters.min_volume > 0)
    params.min_volume = String(filters.min_volume);
  if (filters?.sort) params.sort_by = filters.sort;
  if (filters?.direction) params.direction = filters.direction;
  const raw = await request<unknown[]>("/matches", params);
  return raw.map(transformMatch);
}

/** Fetch a single match by ID */
export async function getMatch(matchId: string): Promise<Match> {
  const raw = await request<unknown>(`/matches/${matchId}`);
  return transformMatch(raw);
}

/** Fetch price history for a match */
export async function getMatchHistory(
  matchId: string,
  hours?: number
): Promise<PriceSnapshot[]> {
  const params: Record<string, string> = {};
  if (hours !== undefined) params.hours = String(hours);
  const raw = await request<unknown[]>(`/matches/${matchId}/history`, params);
  return raw.map(transformSnapshot);
}

/** Fetch markets from one or both platforms */
export async function getMarkets(filters?: MarketFilters): Promise<Market[]> {
  const params: Record<string, string> = {};
  if (filters?.platform) params.platform = filters.platform;
  if (filters?.category) params.category = filters.category;
  return request<Market[]>("/markets", params);
}
