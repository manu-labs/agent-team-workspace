import { Link } from "react-router-dom";
import type { Match } from "../lib/types";
import PlatformCard from "./PlatformCard";
import SpreadChart from "./SpreadChart";
import ProfitCalculator from "./ProfitCalculator";
import SpreadBadge from "./SpreadBadge";

function formatRelativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor(abs / 3_600_000);
  if (days >= 1) return days + " day" + (days === 1 ? "" : "s");
  if (hours >= 1) return hours + " hour" + (hours === 1 ? "" : "s");
  return "< 1 hour";
}

interface MatchDetailProps {
  match: Match;
}

export default function MatchDetail({ match }: MatchDetailProps) {
  const isBuyKalshi = match.direction === "buy_kalshi_sell_poly";

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

      {/* Question */}
      <h1 className="text-lg font-semibold leading-snug text-zinc-100">
        {match.question}
      </h1>

      {/* Spread hero */}
      <div className="flex flex-wrap items-stretch gap-0 border border-terminal-border bg-terminal-surface">
        <div className="flex flex-col justify-center border-r border-terminal-border px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Fee-Adj Spread
          </p>
          <div className="mt-2">
            <SpreadBadge spread={match.fee_adjusted_spread} />
          </div>
        </div>
        <div className="flex flex-col justify-center border-r border-terminal-border px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Direction
          </p>
          <p className="mt-1 font-mono text-sm font-medium text-accent">
            {isBuyKalshi ? "Buy Kalshi / Sell Poly" : "Buy Poly / Sell Kalshi"}
          </p>
        </div>
        <div className="flex flex-col justify-center border-r border-terminal-border px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Confidence
          </p>
          <p
            className={[
              "mt-1 font-mono text-sm font-medium tabular-nums",
              match.confidence >= 0.9 ? "text-profit" : "text-zinc-300",
            ].join(" ")}
          >
            {(match.confidence * 100).toFixed(0)}%
          </p>
        </div>
        <div className="flex flex-col justify-center px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Resolves
          </p>
          <p className="mt-1 font-mono text-sm text-zinc-300">
            {new Date(match.end_date).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            <span className="ml-2 text-zinc-600">
              ({formatRelativeTime(match.end_date)})
            </span>
          </p>
        </div>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PlatformCard
          name="Polymarket"
          yes={match.poly_yes}
          no={match.poly_no}
          volume={match.volume}
          url={match.poly_url}
          buyHere={isBuyKalshi === false}
        />
        <PlatformCard
          name="Kalshi"
          yes={match.kalshi_yes}
          no={match.kalshi_no}
          volume={match.volume}
          url={match.kalshi_url}
          buyHere={isBuyKalshi}
        />
      </div>

      {/* Spread history chart */}
      <SpreadChart
        matchId={match.id}
        currentSpread={match.fee_adjusted_spread}
      />

      {/* Profit calculator */}
      <ProfitCalculator match={match} />

      {/* Metadata footer */}
      <div className="flex flex-wrap gap-x-8 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
        <span>
          Raw spread:{" "}
          <span className="text-zinc-400">
            {(match.raw_spread * 100).toFixed(1)}&cent;
          </span>
        </span>
        <span>
          Last updated:{" "}
          <span className="text-zinc-400">
            {new Date(match.last_updated).toLocaleTimeString()}
          </span>
        </span>
        <span>
          Match ID: <span className="text-zinc-500">{match.id}</span>
        </span>
      </div>
    </div>
  );
}
