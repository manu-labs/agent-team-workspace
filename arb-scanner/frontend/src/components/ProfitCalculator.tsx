import { useState } from "react";
import type { Match } from "../lib/types";

interface ProfitCalculatorProps {
  match: Match;
}

// Kalshi actuarial fee formula: min(7% * p * (1-p), $0.02) per contract
// Polymarket: no fees
function kalshiFeePerContract(price: number): number {
  return Math.min(0.07 * price * (1 - price), 0.02);
}

function fmtUSD(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return sign + "$" + abs.toFixed(2);
}

function fmtPct(n: number): string {
  return (n >= 0 ? "+" : "") + (n * 100).toFixed(2) + "%";
}

export default function ProfitCalculator({ match }: ProfitCalculatorProps) {
  const [contracts, setContracts] = useState(100);

  const isBuyKalshi = match.direction === "buy_kalshi_sell_poly";
  const buyPrice = isBuyKalshi ? match.kalshi_yes : match.poly_yes;
  const sellPrice = isBuyKalshi ? match.poly_yes : match.kalshi_yes;

  // Fee: Kalshi actuarial formula per contract; Polymarket has no fees
  const feePerContract = isBuyKalshi ? kalshiFeePerContract(buyPrice) : 0;

  const buyCost = contracts * buyPrice;
  const sellRevenue = contracts * sellPrice;
  const feeAmount = contracts * feePerContract;
  const netProfit = sellRevenue - buyCost - feeAmount;
  const roi = buyCost > 0 ? netProfit / buyCost : 0;

  const buyPlatform = isBuyKalshi ? "Kalshi" : "Polymarket";
  const sellPlatform = isBuyKalshi ? "Polymarket" : "Kalshi";

  return (
    <div className="border border-terminal-border bg-terminal-surface">
      <div className="border-b border-terminal-border px-4 py-2.5">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Profit Calculator
        </h2>
      </div>

      <div className="p-4">
        {/* Contracts input */}
        <div className="flex items-center gap-3">
          <label className="w-20 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Contracts
          </label>
          <input
            type="number"
            min={1}
            max={100_000}
            step={1}
            value={contracts}
            onChange={(e) =>
              setContracts(Math.max(1, Math.floor(Number(e.target.value))))
            }
            className="w-28 border border-terminal-border bg-terminal-bg px-2 py-1 font-mono text-sm tabular-nums text-zinc-200 focus:border-accent/50 focus:outline-none"
          />
        </div>

        {/* Breakdown */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-zinc-500">
              Buy {contracts} on {buyPlatform}
            </span>
            <span className="tabular-nums text-zinc-400">
              {fmtUSD(-buyCost)}
            </span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span className="text-zinc-500">
              Sell {contracts} on {sellPlatform}
            </span>
            <span className="tabular-nums text-zinc-400">
              {fmtUSD(sellRevenue)}
            </span>
          </div>
          {feeAmount > 0 && (
            <div className="flex justify-between font-mono text-xs">
              <span className="text-zinc-500">
                Kalshi fee
              </span>
              <span className="tabular-nums text-loss">
                {fmtUSD(-feeAmount)}
              </span>
            </div>
          )}

          {/* Net profit */}
          <div className="mt-2 border-t border-terminal-border pt-2">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                Net profit
              </span>
              <div className="text-right">
                <span
                  className={[
                    "font-mono text-lg font-bold tabular-nums",
                    netProfit > 0 ? "text-profit profit-glow" : "text-loss",
                  ].join(" ")}
                >
                  {fmtUSD(netProfit)}
                </span>
                <span
                  className={[
                    "ml-2 font-mono text-xs tabular-nums",
                    roi > 0 ? "text-profit/70" : "text-loss/70",
                  ].join(" ")}
                >
                  ({fmtPct(roi)})
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 font-mono text-[10px] leading-relaxed text-zinc-600">
          Assumes immediate fill at quoted prices. Kalshi fee: min(7% &times; p &times; (1&minus;p),&nbsp;$0.02)/contract.
          Does not account for slippage or counterparty risk.
        </p>
      </div>
    </div>
  );
}
