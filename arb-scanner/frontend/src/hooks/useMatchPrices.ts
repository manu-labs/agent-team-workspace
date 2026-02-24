import { useState, useEffect } from "react";
import { wsManager } from "../lib/websocket";
import type { PriceUpdate } from "../lib/websocket";

/** Returns the latest WS price update for a match, or null before the first update */
export function useMatchPrices(matchId: number | string): PriceUpdate | null {
  const [prices, setPrices] = useState<PriceUpdate | null>(null);

  useEffect(() => {
    const id = typeof matchId === "string" ? parseInt(matchId, 10) : matchId;
    if (isNaN(id)) return;
    const unsub = wsManager.subscribe(id, setPrices);
    return unsub;
  }, [matchId]);

  return prices;
}
