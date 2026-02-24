import { useNavigate } from "react-router-dom";
import type { Match } from "../lib/types";
import SpreadBadge, { spreadRowBg } from "./SpreadBadge";

// ── Formatters ────────────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  return (n * 100).toFixed(0) + "\u00a2";
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

function formatRelativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60_000);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(abs / 86_400_000);
  if (days >= 1) return days + "d";
  if (hours >= 1) return hours + "h";
  if (mins >= 1) return mins + "m";
  return "now";
}

// ── Liquidity indicator ───────────────────────────────────────────────────────

function LiquidityDot({ volume }: { volume: number }) {
  let colorClass: string;
  let title: string;
  if (volume >= 100_000) {
    colorClass = "bg-profit";
    title = "High liquidity (>$100K)";
  } else if (volume >= 10_000) {
    colorClass = "bg-yellow-500/80";
    title = "Medium liquidity ($10K–$100K)";
  } else if (volume >= 1_000) {
    colorClass = "bg-zinc-400";
    title = "Low liquidity ($1K–$10K)";
  } else {
    colorClass = "bg-zinc-700";
    title = "Very low liquidity (<$1K)";
  }
  return (
    <span
      className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${colorClass}`}
      title={title}
    />
  );
}

// ── Platform link icons ───────────────────────────────────────────────────────

function PlatformLink({
  href,
  label,
  shortLabel,
}: {
  href: string;
  label: string;
  shortLabel: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 border border-terminal-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 transition-colors hover:border-accent/50 hover:text-accent"
    >
      {shortLabel}
      <span className="opacity-50">{"\u2197"}</span>
    </a>
  );
}

// ── Desktop table row ─────────────────────────────────────────────────────────

interface MatchRowProps {
  match: Match;
}

export default function MatchRow({ match }: MatchRowProps) {
  const navigate = useNavigate();
  const rowBg = spreadRowBg(match.fee_adjusted_spread);

  function handleRowClick() {
    navigate(`/matches/${match.id}`);
  }

  return (
    <>
      {/* Desktop row */}
      <tr
        onClick={handleRowClick}
        className={[
          "hidden cursor-pointer border-b border-terminal-border sm:table-row",
          "transition-colors duration-100 table-row-hover",
          rowBg,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Market question */}
        <td
          className="max-w-0 px-3 py-2.5"
          title={match.question}
        >
          <span className="block truncate text-sm text-zinc-200">
            {match.question}
          </span>
        </td>

        {/* Poly YES */}
        <td className="data-cell whitespace-nowrap px-3 py-2.5 text-zinc-400">
          {formatPrice(match.poly_yes)}
        </td>

        {/* Kalshi YES */}
        <td className="data-cell whitespace-nowrap px-3 py-2.5 text-zinc-400">
          {formatPrice(match.kalshi_yes)}
        </td>

        {/* Fee-adjusted spread */}
        <td className="whitespace-nowrap px-3 py-2.5">
          <SpreadBadge spread={match.fee_adjusted_spread} />
        </td>

        {/* Volume + liquidity dot */}
        <td className="data-cell whitespace-nowrap px-3 py-2.5 text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <LiquidityDot volume={match.volume} />
            {formatVolume(match.volume)}
          </span>
        </td>

        {/* Ends */}
        <td className="data-cell whitespace-nowrap px-3 py-2.5 text-zinc-500">
          {formatRelativeTime(match.end_date)}
        </td>

        {/* Platform links */}
        <td className="whitespace-nowrap px-3 py-2.5">
          <div className="flex gap-1.5">
            <PlatformLink
              href={match.poly_url}
              label="Open on Polymarket"
              shortLabel="POLY"
            />
            <PlatformLink
              href={match.kalshi_url}
              label="Open on Kalshi"
              shortLabel="KAL"
            />
          </div>
        </td>
      </tr>

      {/* Mobile card */}
      <tr className="sm:hidden">
        <td colSpan={7} className="p-0">
          <div
            onClick={handleRowClick}
            className={[
              "cursor-pointer border-b border-terminal-border p-3",
              "transition-colors duration-100 active:bg-terminal-muted/50",
              rowBg,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* Question + spread */}
            <div className="flex items-start justify-between gap-3">
              <p className="flex-1 text-sm leading-snug text-zinc-200 line-clamp-2">
                {match.question}
              </p>
              <SpreadBadge spread={match.fee_adjusted_spread} />
            </div>

            {/* Stats row */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-zinc-500">
              <span>
                Poly{" "}
                <span className="text-zinc-300">
                  {formatPrice(match.poly_yes)}
                </span>
              </span>
              <span>
                Kalshi{" "}
                <span className="text-zinc-300">
                  {formatPrice(match.kalshi_yes)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <LiquidityDot volume={match.volume} />
                {formatVolume(match.volume)}
              </span>
              <span>Ends {formatRelativeTime(match.end_date)}</span>
            </div>

            {/* Platform links */}
            <div className="mt-2 flex gap-2">
              <PlatformLink
                href={match.poly_url}
                label="Open on Polymarket"
                shortLabel="POLY"
              />
              <PlatformLink
                href={match.kalshi_url}
                label="Open on Kalshi"
                shortLabel="KAL"
              />
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}
