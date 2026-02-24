/** A matched pair of markets across Polymarket and Kalshi */
export interface Match {
  id: string;
  question: string;
  poly_yes: number;
  poly_no: number;
  kalshi_yes: number;
  kalshi_no: number;
  raw_spread: number;
  fee_adjusted_spread: number;
  direction: "buy_kalshi_sell_poly" | "buy_poly_sell_kalshi";
  volume: number;
  end_date: string;
  poly_url: string;
  kalshi_url: string;
  confidence: number;
  last_updated: string;
}

/** A historical price snapshot for charting spread over time */
export interface PriceSnapshot {
  timestamp: string;
  poly_yes: number;
  poly_no: number;
  kalshi_yes: number;
  kalshi_no: number;
  raw_spread: number;
  fee_adjusted_spread: number;
}

/** A single market from either platform */
export interface Market {
  id: string;
  platform: "polymarket" | "kalshi";
  question: string;
  yes_price: number;
  no_price: number;
  volume: number;
  end_date: string;
  category: string;
  url: string;
  last_updated: string;
}

/** Query parameters for the matches endpoint */
export interface MatchFilters {
  min_spread?: number;
  sort?: "spread" | "volume" | "confidence" | "end_date";
  direction?: "asc" | "desc";
}

/** Query parameters for the markets endpoint */
export interface MarketFilters {
  platform?: "polymarket" | "kalshi";
  category?: string;
}