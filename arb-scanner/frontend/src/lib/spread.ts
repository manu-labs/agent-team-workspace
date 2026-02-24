import type { Match } from "./types";

/** Kalshi actuarial fee: min(7% * p * (1-p), $0.02) per contract */
export function kalshiFee(kalshiYes: number): number {
  return Math.min(0.07 * kalshiYes * (1 - kalshiYes), 0.02);
}

export interface SpreadResult {
  raw_spread: number;
  fee_adjusted_spread: number;
  direction: Match["direction"];
}

/** Compute spread, direction, and fee-adjusted spread from live prices */
export function computeSpread(
  polyYes: number,
  polyNo: number,
  kalshiYes: number,
  kalshiNo: number
): SpreadResult {
  const spreadBuyPoly = 1 - polyYes - kalshiNo;   // Buy YES Poly + Buy NO Kalshi
  const spreadBuyKalshi = 1 - kalshiYes - polyNo;  // Buy YES Kalshi + Buy NO Poly

  let rawSpread: number;
  let direction: Match["direction"];
  if (spreadBuyKalshi >= spreadBuyPoly) {
    rawSpread = spreadBuyKalshi;
    direction = "buy_kalshi_sell_poly";
  } else {
    rawSpread = spreadBuyPoly;
    direction = "buy_poly_sell_kalshi";
  }

  return {
    raw_spread: rawSpread,
    fee_adjusted_spread: rawSpread - kalshiFee(kalshiYes),
    direction,
  };
}
