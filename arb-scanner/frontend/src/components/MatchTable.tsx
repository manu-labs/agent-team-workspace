import { useState, useEffect, useRef, useCallback } from "react";
import { getMatches } from "../lib/api";
import type { Match, MatchFilters } from "../lib/types";
import MatchRow from "./MatchRow";

const REFRESH_INTERVAL_MS = 30_000;

// ── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <>
      {/* Desktop skeleton */}
      <tr className="hidden border-b border-terminal-border sm:table-row">
        <td className="px-3 py-2.5">
          <div className="h-4 w-3/4 animate-pulse bg-terminal-muted" />
        </td>
        <td className="px-3 py-2.5">
          <div className="h-4 w-10 animate-pulse bg-terminal-muted" />
        </td>
        <td className="px-3 py-2.5">
          <div className="h-4 w-10 animate-pulse bg-terminal-muted" />
        </td>
        <td className="px-3 py-2.5">
          <div className="h-5 w-14 animate-pulse bg-terminal-muted" />
        </td>
        <td className="px-3 py-2.5">
          <div className="h-4 w-12 animate-pulse bg-terminal-muted" />
        </td>
        <td className="px-3 py-2.5">
          <div className="h-4 w-8 animate-pulse bg-terminal-muted" />
        </td>
        <td className="px-3 py-2.5">
          <div className="h-4 w-20 animate-pulse bg-terminal-muted" />
        </td>
      </tr>
      {/* Mobile skeleton */}
      <tr className="sm:hidden">
        <td colSpan={7} className="border-b border-terminal-border p-3">
          <div className="h-4 w-4/5 animate-pulse bg-terminal-muted" />
          <div className="mt-2 h-3 w-1/2 animate-pulse bg-terminal-muted" />
        </td>
      </tr>
    </>
  );
}

// ── Last updated counter ──────────────────────────────────────────────────────

function useSecondsTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

function LastUpdated({ updatedAt }: { updatedAt: Date | null }) {
  useSecondsTick(); // re-render every second
  if (updatedAt === null) return null;
  const secs = Math.floor((Date.now() - updatedAt.getTime()) / 1000);
  const label =
    secs < 5
      ? "just now"
      : secs < 60
        ? `${secs}s ago`
        : `${Math.floor(secs / 60)}m ago`;
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
      Updated {label}
    </span>
  );
}

// ── Sort helpers ──────────────────────────────────────────────────────────────

type SortKey = "spread" | "volume" | "confidence";

const SORT_LABELS: Record<SortKey, string> = {
  spread: "Spread",
  volume: "Volume",
  confidence: "Conf",
};

function sortMatches(matches: Match[], key: SortKey): Match[] {
  return [...matches].sort((a, b) => {
    if (key === "spread") return b.fee_adjusted_spread - a.fee_adjusted_spread;
    if (key === "volume") return b.volume - a.volume;
    return b.confidence - a.confidence;
  });
}

// ── Volume filter presets ─────────────────────────────────────────────────────

const VOLUME_PRESETS: { label: string; value: number }[] = [
  { label: "Any", value: 0 },
  { label: "$1K", value: 1_000 },
  { label: "$10K", value: 10_000 },
  { label: "$100K", value: 100_000 },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function MatchTable() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [minSpreadCents, setMinSpreadCents] = useState(0); // slider in cents
  const [minVolume, setMinVolume] = useState(0); // server-side volume filter
  const [sortKey, setSortKey] = useState<SortKey>("volume"); // default: most liquid first

  const abortRef = useRef<AbortController | null>(null);

  const fetchMatches = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const filters: MatchFilters = { sort: "volume", direction: "desc" };
      if (minVolume > 0) filters.min_volume = minVolume;
      const data = await getMatches(filters);
      if (ctrl.signal.aborted) return;
      setMatches(data);
      setError(null);
      setUpdatedAt(new Date());
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      if (ctrl.signal.aborted === false) setLoading(false);
    }
  }, [minVolume]);

  // Initial load + re-fetch when server-side filters change
  useEffect(() => {
    void fetchMatches();
    return () => abortRef.current?.abort();
  }, [fetchMatches]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => void fetchMatches(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchMatches]);

  // Client-side filtering + sorting
  const minSpreadDecimal = minSpreadCents / 100;
  const visible = sortMatches(
    matches.filter((m) => {
      if (m.fee_adjusted_spread < minSpreadDecimal) return false;
      if (search && search.trim().length > 0) {
        return m.question.toLowerCase().includes(search.toLowerCase().trim());
      }
      return true;
    }),
    sortKey
  );

  const hasActiveFilters = search.length > 0 || minSpreadCents > 0 || minVolume > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-terminal-border bg-terminal-surface px-3 py-2.5">
        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter markets..."
          className="h-7 w-44 border border-terminal-border bg-terminal-bg px-2 font-mono text-xs text-zinc-300 placeholder-zinc-600 focus:border-accent/50 focus:outline-none"
        />

        {/* Min spread slider */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Min
          </span>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={minSpreadCents}
            onChange={(e) => setMinSpreadCents(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer accent-profit"
          />
          <span className="w-8 font-mono text-xs tabular-nums text-zinc-400">
            {minSpreadCents === 0 ? "any" : minSpreadCents.toFixed(1) + "\u00a2"}
          </span>
        </div>

        {/* Min volume presets */}
        <div className="flex items-center gap-0.5">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Vol
          </span>
          {VOLUME_PRESETS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setMinVolume(value)}
              className={[
                "px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                minVolume === value
                  ? "bg-terminal-muted text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort toggle */}
        <div className="flex items-center gap-0.5">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={[
                "px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                sortKey === key
                  ? "bg-terminal-muted text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              {SORT_LABELS[key]}
              {sortKey === key && " \u2193"}
            </button>
          ))}
        </div>

        {/* Spacer + last updated */}
        <div className="ml-auto flex items-center gap-3">
          <LastUpdated updatedAt={updatedAt} />
          <button
            onClick={() => void fetchMatches()}
            disabled={loading}
            className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 transition-colors hover:text-zinc-400 disabled:opacity-40"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* Column headers — hidden on mobile */}
          <thead className="hidden sm:table-header-group">
            <tr className="border-b border-terminal-border">
              {[
                ["Market", "w-auto"],
                ["Poly", "w-20"],
                ["Kalshi", "w-20"],
                [sortKey === "spread" ? "Spread \u2193" : "Spread", "w-24"],
                [sortKey === "volume" ? "Volume \u2193" : "Volume", "w-24"],
                ["Ends", "w-16"],
                ["Links", "w-28"],
              ].map(([label, width]) => (
                <th
                  key={label}
                  className={`${width} px-3 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Loading state */}
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}

            {/* Error state */}
            {loading === false && error !== null && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center">
                  <p className="font-mono text-xs text-loss">{error}</p>
                  <button
                    onClick={() => void fetchMatches()}
                    className="mt-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500 underline hover:text-zinc-300"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            )}

            {/* Empty state */}
            {loading === false && error === null && visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center">
                  <p className="font-mono text-xs uppercase tracking-wider text-zinc-600">
                    No arbitrage opportunities found
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setMinSpreadCents(0);
                        setMinVolume(0);
                      }}
                      className="mt-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500 underline hover:text-zinc-300"
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            )}

            {/* Data rows */}
            {loading === false &&
              error === null &&
              visible.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
          </tbody>
        </table>
      </div>

      {/* Row count footer */}
      {loading === false && error === null && visible.length > 0 && (
        <div className="border-t border-terminal-border px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            {visible.length} opportunit{visible.length === 1 ? "y" : "ies"}
            {visible.length !== matches.length &&
              ` (filtered from ${matches.length})`}
          </span>
        </div>
      )}
    </div>
  );
}
