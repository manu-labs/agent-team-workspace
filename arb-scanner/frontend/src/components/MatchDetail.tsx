import { Link } from "react-router-dom";
import type { Match } from "../lib/types";

/** Placeholder match for the scaffold */
const STUB_MATCH: Match = {
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
};

function formatPercent(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

function directionLabel(d: string): string {
  if (d === "buy_kalshi_sell_poly") return "BUY Kalshi / SELL Poly";
  return "BUY Poly / SELL Kalshi";
}

interface MatchDetailProps {
  match?: Match;
}

export default function MatchDetail({ match = STUB_MATCH }: MatchDetailProps) {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <span>&larr;</span>
        <span>Back to dashboard</span>
      </Link>

      {/* Question title */}
      <h1 className="text-xl font-semibold text-zinc-100">
        {match.question}
      </h1>

      {/* Spread hero */}
      <div className="flex items-center gap-6 rounded-none border border-terminal-border bg-terminal-surface p-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Fee-Adjusted Spread
          </p>
          <p className="mt-1 font-mono text-3xl font-bold text-profit profit-glow">
            {formatPercent(match.fee_adjusted_spread)}
          </p>
        </div>
        <div className="h-12 w-px bg-terminal-border" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Direction
          </p>
          <p className="mt-1 font-mono text-sm font-medium text-accent">
            {directionLabel(match.direction)}
          </p>
        </div>
        <div className="h-12 w-px bg-terminal-border" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Confidence
          </p>
          <p className="mt-1 font-mono text-sm font-medium text-zinc-200">
            {formatPercent(match.confidence)}
          </p>
        </div>
      </div>

      {/* Price comparison grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Polymarket */}
        <div className="border border-terminal-border bg-terminal-surface p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Polymarket
            </h3>
            <a
              href={match.poly_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] uppercase tracking-wider text-accent hover:underline"
            >
              Open &rarr;
            </a>
          </div>
          <div className="mt-3 flex gap-6">
            <div>
              <p className="font-mono text-[10px] text-zinc-500">YES</p>
              <p className="data-cell text-lg text-zinc-200">
                {formatPercent(match.poly_yes)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-zinc-500">NO</p>
              <p className="data-cell text-lg text-zinc-200">
                {formatPercent(match.poly_no)}
              </p>
            </div>
          </div>
        </div>

        {/* Kalshi */}
        <div className="border border-terminal-border bg-terminal-surface p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Kalshi
            </h3>
            <a
              href={match.kalshi_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] uppercase tracking-wider text-accent hover:underline"
            >
              Open &rarr;
            </a>
          </div>
          <div className="mt-3 flex gap-6">
            <div>
              <p className="font-mono text-[10px] text-zinc-500">YES</p>
              <p className="data-cell text-lg text-zinc-200">
                {formatPercent(match.kalshi_yes)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-zinc-500">NO</p>
              <p className="data-cell text-lg text-zinc-200">
                {formatPercent(match.kalshi_no)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="border border-dashed border-terminal-border bg-terminal-surface p-8">
        <p className="text-center font-mono text-xs uppercase tracking-wider text-zinc-500">
          Spread history chart &mdash; will be implemented in #201
        </p>
        <div className="mx-auto mt-4 flex h-40 max-w-lg items-end justify-around gap-1">
          {/* Fake bar chart placeholder */}
          {Array.from({ length: 24 }).map((_, i) => {
            const h = 20 + Math.sin(i * 0.5) * 30 + Math.random() * 20;
            return (
              <div
                key={i}
                className="w-full rounded-t-sm bg-profit/20"
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs text-zinc-500">
        <span>
          Volume: <span className="text-zinc-300">${(match.volume / 1_000_000).toFixed(1)}M</span>
        </span>
        <span>
          Ends: <span className="text-zinc-300">{new Date(match.end_date).toLocaleDateString()}</span>
        </span>
        <span>
          Updated: <span className="text-zinc-300">{new Date(match.last_updated).toLocaleTimeString()}</span>
        </span>
      </div>
    </div>
  );
}