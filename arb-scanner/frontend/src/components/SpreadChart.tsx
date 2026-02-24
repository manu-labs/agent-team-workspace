import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { getMatchHistory } from "../lib/api";
import type { PriceSnapshot } from "../lib/types";

interface SpreadChartProps {
  matchId: string;
  currentSpread: number;
}

const RANGES: { label: string; hours: number }[] = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
];

function formatTime(iso: string, hours: number): string {
  const d = new Date(iso);
  if (hours <= 6) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (hours <= 24) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface ChartPoint {
  time: string;
  spread: number;
}

export default function SpreadChart({
  matchId,
  currentSpread,
}: SpreadChartProps) {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getMatchHistory(matchId, hours)
      .then((snapshots: PriceSnapshot[]) => {
        setData(
          snapshots.map((s) => ({
            time: formatTime(s.timestamp, hours),
            spread: parseFloat((s.fee_adjusted_spread * 100).toFixed(2)),
          }))
        );
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load history");
      })
      .finally(() => setLoading(false));
  }, [matchId, hours]);

  const currentCents = parseFloat((currentSpread * 100).toFixed(2));

  return (
    <div className="border border-terminal-border bg-terminal-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border px-4 py-2.5">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Spread History
        </h2>
        <div className="flex gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r.hours}
              onClick={() => setHours(r.hours)}
              className={[
                "px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                hours === r.hours
                  ? "bg-terminal-muted text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart body */}
      <div className="p-4">
        {loading && (
          <div className="flex h-40 items-center justify-center">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-600 animate-pulse">
              Loading...
            </span>
          </div>
        )}

        {loading === false && error !== null && (
          <div className="flex h-40 items-center justify-center">
            <span className="font-mono text-xs text-loss">{error}</span>
          </div>
        )}

        {loading === false && error === null && data.length === 0 && (
          <div className="flex h-40 items-center justify-center">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-600">
              No history available
            </span>
          </div>
        )}

        {loading === false && error === null && data.length > 0 && (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="time"
                tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "#52525b" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "#52525b" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v.toFixed(1) + "\u00a2"}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "#12121a",
                  border: "1px solid #1e1e2e",
                  borderRadius: 0,
                  fontFamily: "JetBrains Mono",
                  fontSize: 11,
                  color: "#d4d4d8",
                }}
                formatter={(v: number) => [v.toFixed(2) + "\u00a2", "Spread"]}
                labelStyle={{ color: "#71717a", marginBottom: 2 }}
                cursor={{ stroke: "#2a2a3a" }}
              />
              {/* Reference line at current spread */}
              <ReferenceLine
                y={currentCents}
                stroke="#22c55e"
                strokeDasharray="3 3"
                strokeOpacity={0.4}
              />
              <Line
                type="monotone"
                dataKey="spread"
                stroke="#22c55e"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: "#22c55e", stroke: "none" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}