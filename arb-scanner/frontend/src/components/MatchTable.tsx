import { Link } from "react-router-dom";
import type { Match } from "../lib/types";

/** Placeholder data for the scaffold — removed once real API is connected */
const STUB_MATCHES: Match[] = [
  {
    id: "1",
    question: "Will Bitcoin exceed $100k by March 2026?",
    poly_yes: 0.62,
    poly_no: 0.38,
    kalshi_yes: 0.55,
    kalshi_no: 0.45,
    raw_spread: 0.07,
    fee_adjusted_spread: 0.054,
    direction: "buy_kalshi_sell_poly",
    volume: 1_250_000,
    end_date: "2026-03-31T23:59:59Z",
    poly_url: "https://polymarket.com",
    kalshi_url: "https://kalshi.com",
    confidence: 0.92,
    last_updated: new Date().toISOString(),
  },
  {
    id: "2",
    question: "Will the Fed cut rates in Q1 2026?",
    poly_yes: 0.41,
    poly_no: 0.59,
    kalshi_yes: 0.35,
    kalshi_no: 0.65,
    raw_spread: 0.06,
    fee_adjusted_spread: 0.042,
    direction: "buy_kalshi_sell_poly",
    volume: 890_000,
    end_date: "2026-03-31T23:59:59Z",
    poly_url: "https://polymarket.com",
    kalshi_url: "https://kalshi.com",
    confidence: 0.87,
    last_updated: new Date().toISOString(),
  },
  {
    id: "3",
    question: "Oscar Best Picture: will a streaming film win?",
    poly_yes: 0.73,
    poly_no: 0.27,
    kalshi_yes: 0.68,
    kalshi_no: 0.32,
    raw_spread: 0.05,
    fee_adjusted_spread: 0.038,
    direction: "buy_kalshi_sell_poly",
    volume: 420_000,
    end_date: "2026-03-15T23:59:59Z",
    poly_url: "https://polymarket.com",
    kalshi_url: "https://kalshi.com",
    confidence: 0.78,
    last_updated: new Date().toISOString(),
  },
];

function formatSpread(spread: number): string {
  return (spread * 100).toFixed(1) + "%";
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return "$" + (vol / 1_000_000).toFixed(1) + "M";
  if (vol >= 1_000) return "$" + (vol / 1_000).toFixed(0) + "K";
  return "$" + vol.toString();
}

function formatPrice(price: number): string {
  return (price * 100).toFixed(0) + "\u00A2";
}

interface MatchTableProps {
  matches?: Match[];
}

export default function MatchTable({ matches = STUB_MATCHES }: MatchTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-terminal-border text-left">
            <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Market
            </th>
            <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Poly YES
            </th>
            <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Kalshi YES
            </th>
            <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Raw Spread
            </th>
            <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Fee-Adj Spread
            </th>
            <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Volume
            </th>
            <th className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Conf
            </th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <Link
              key={m.id}
              to={`/matches/${m.id}`}
              className="table-row table-row-hover cursor-pointer"
            >
              <td className="max-w-xs truncate px-3 py-3 text-sm text-zinc-200">
                {m.question}
              </td>
              <td className="data-cell px-3 py-3 text-zinc-400">
                {formatPrice(m.poly_yes)}
              </td>
              <td className="data-cell px-3 py-3 text-zinc-400">
                {formatPrice(m.kalshi_yes)}
              </td>
              <td className="data-cell px-3 py-3 text-zinc-400">
                {formatSpread(m.raw_spread)}
              </td>
              <td className="data-cell px-3 py-3">
                <span
                  className={
                    m.fee_adjusted_spread > 0
                      ? "text-profit profit-glow"
                      : "text-zinc-400"
                  }
                >
                  {formatSpread(m.fee_adjusted_spread)}
                </span>
              </td>
              <td className="data-cell px-3 py-3 text-zinc-500">
                {formatVolume(m.volume)}
              </td>
              <td className="data-cell px-3 py-3">
                <span
                  className={
                    m.confidence >= 0.9
                      ? "text-profit"
                      : m.confidence >= 0.7
                        ? "text-yellow-500"
                        : "text-loss"
                  }
                >
                  {(m.confidence * 100).toFixed(0)}%
                </span>
              </td>
            </Link>
          ))}
        </tbody>
      </table>
    </div>
  );
}