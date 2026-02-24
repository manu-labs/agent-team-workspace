import { useState, useEffect, useCallback, useRef } from "react";
import { getMatches } from "../lib/api";
import type { Match } from "../lib/types";
import MatchRow from "./MatchRow";

// ── Constants ─────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 30_000;
const SORT_OPTIONS = [
  { label: "Spread \u2193", value: "spread" },
  { label: "Volume \u2193", value: "volume" },
  { label: "Conf \u2193", value: "confidence" },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="hidden border-b border-terminal-border sm:table-row">
      {[60, 12, 12, 16, 14, 10, 18].map((w, i) => (
        <td key={i} className="px-3 py-3">
          <div
            className="h-3 animate-pulse bg-terminal-muted"
            style={{ width: `${w}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

function MobileSkeletonCard() {
  return (
    <tr className="sm:hidden">
      <td colSpan={7} className="p-0">
        <div className="border-b border-terminal-border p-3 space-y-2">
          <div className="flex justify-between gap-3">
            <div className="h-3 w-2/3 animate-pulse bg-terminal-muted" />
            <div className="h-5 w-14 animate-pulse bg-terminal-muted" />
          </div>
          <div className="h-2.5 w-1/2 animate-pulse bg-terminal-muted" />
        </div>
      </td>
    </tr>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  minSpread: number;
  onMinSpread: (v: number) => void;
  sort: SortValue;
  onSort: (v: SortValue) => void;
  lastUpdatedSecs: number | null;
  loading: boolean;
  onRefresh: () => void;
}

function FilterBar({
  search,
  onSearch,
  minSpread,
  onMinSpread,
  sort,
  onSort,
  lastUpdatedSecs,
  loading,
  onRefresh,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-terminal-border bg-terminal-surface px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search markets\u2026"
        className="h-7 flex-1 min-w-[160px] border border-terminal-border bg-terminal-bg px-2 font-mono text-xs text-zinc-300 placeholder-zinc-600 focus:border-accent/50 focus:outline-none"
      />

      {/* Min spread slider */}
      <label className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 whitespace-nowrap">
          Min
        </span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={minSpread * 100}
          onChange={(e) => onMinSpread(Number(e.target.value) / 100)}
          className="w-24 accent-profit"
        />
        <span className="data-cell w-8 text-right text-xs text-zinc-300">
          {(minSpread * 100).toFixed(1)}\u00a2
        </span>
      </label>

      {/* Sort toggle */}
      <div className="flex shrink-0">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSort(opt.value)}
            className={[
              "border border-terminal-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
              "-ml-px first:ml-0",
              sort === opt.value
                ? "border-accent/50 bg-accent/10 text-accent"
                : "bg-terminal-bg text-zinc-500 hover:text-zinc-300",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Last updated + manual refresh */}
      <div className="flex items-center gap-2 sm:ml-auto shrink-0">
        <span className="font-mono text-[10px] text-zinc-600">
          {lastUpdatedSecs === null
            ? ""
            : lastUpdatedSecs < 5
            ? "Just now"
            : `${lastUpdatedSecs}s ago`}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh now"
          className="border border-terminal-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500 transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-40"
        >
          {loading ? "\u29d7" : "\u21bb"}
        </button>
      </div>
    </div>
  );
}

// ── Column headers ────────────────────────────────────────────────────────────

function TableHead() {
  return (
    <thead className="hidden sm:table-header-group">
      <tr className="border-b border-terminal-border">
        {["Market", "Poly", "Kalshi", "Spread \u2193", "Volume", "Ends", "Links"].map(
          (col) => (
            <th
              key={col}
              className="px-3 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              {col}
            </th>
          )
        )}
      </tr>
    </thead>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MatchTable() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [minSpread, setMinSpread] = useState(0);
  const [sort, setSort] = useState<SortValue>("spread");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [lastUpdatedSecs, setLastUpdatedSecs] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMatches({ sort, direction: "desc" });
      setMatches(data);
      setLastUpdatedAt(Date.now());
      setLastUpdatedSecs(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [sort]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchMatches();
    intervalRef.current = setInterval(fetchMatches, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMatches]);

  // "Updated X seconds ago" ticker
  useEffect(() => {
    tickRef.current = setInterval(() => {
      if (lastUpdatedAt !== null) {
        setLastUpdatedSecs(Math.floor((Date.now() - lastUpdatedAt) / 1000));
      }
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [lastUpdatedAt]);

  // Client-side filter + sort
  const visible = matches
    .filter((m) => {
      if (m.fee_adjusted_spread < minSpread) return false;
      if (search && !m.question.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "volume") return b.volume - a.volume;
      if (sort === "confidence") return b.confidence - a.confidence;
      return b.fee_adjusted_spread - a.fee_adjusted_spread;
    });

  return (
    <div>
      <FilterBar
        search={search}
        onSearch={setSearch}
        minSpread={minSpread}
        onMinSpread={setMinSpread}
        sort={sort}
        onSort={(v) => setSort(v)}
        lastUpdatedSecs={lastUpdatedSecs}
        loading={loading}
        onRefresh={fetchMatches}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <TableHead />
          <tbody>
            {loading && matches.length === 0 ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <>
                    <SkeletonRow key={`desk-${i}`} />
                    <MobileSkeletonCard key={`mob-${i}`} />
                  </>
                ))}
              </>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="font-mono text-xs text-loss">
                    Error: {error}
                  </p>
                  <button
                    onClick={fetchMatches}
                    className="mt-3 border border-terminal-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <p className="font-mono text-xs uppercase tracking-wider text-zinc-600">
                    {search || minSpread > 0
                      ? "No matches for current filters"
                      : "No arbitrage opportunities found"}
                  </p>
                  {(search || minSpread > 0) && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setMinSpread(0);
                      }}
                      className="mt-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500 underline hover:text-zinc-300"
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              visible.map((m) => <MatchRow key={m.id} match={m} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Count footer */}
      {visible.length > 0 && (
        <div className="border-t border-terminal-border px-3 py-2">
          <p className="font-mono text-[10px] text-zinc-600">
            {visible.length} opportunit{visible.length === 1 ? "y" : "ies"}
            {visible.length !== matches.length &&
              ` (filtered from ${matches.length})`}
          </p>
        </div>
      )}
    </div>
  );
}
