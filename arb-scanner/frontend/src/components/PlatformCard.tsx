interface PlatformCardProps {
  name: "Polymarket" | "Kalshi";
  yes: number;
  no: number;
  /** Platform-specific volume: USD for Polymarket, contracts for Kalshi */
  volume: number;
  url: string;
  /** Which contract to buy on this platform */
  buyAction?: "YES" | "NO";
}

function fmt(n: number): string {
  return (n * 100).toFixed(1) + "\u00a2";
}

/** Format Polymarket volume as USD ($94.5M, $3.4K, $12) */
function fmtUSD(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

/** Format Kalshi volume as integer contracts (94.5M, 3.4K, 12) */
function fmtContracts(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return Math.round(n).toString();
}

export default function PlatformCard({
  name,
  yes,
  no,
  volume,
  url,
  buyAction,
}: PlatformCardProps) {
  const isPolymarket = name === "Polymarket";
  const volumeValue = isPolymarket ? fmtUSD(volume) : fmtContracts(volume);
  const volumeUnit = isPolymarket ? "USD" : "contracts";

  return (
    <div
      className={[
        "flex flex-col border bg-terminal-surface p-4",
        buyAction ? "border-profit/40" : "border-terminal-border",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-300">
            {name}
          </h3>
          {buyAction && (
            <span className="border border-profit/40 bg-profit/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-profit">
              BUY {buyAction}
            </span>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] uppercase tracking-wider text-accent transition-colors hover:underline"
        >
          {"Open \u2197"}
        </a>
      </div>

      {/* Prices */}
      <div className="mt-4 flex gap-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            YES
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-zinc-100">
            {fmt(yes)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            NO
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-zinc-500">
            {fmt(no)}
          </p>
        </div>
      </div>

      {/* Volume */}
      <div className="mt-4 border-t border-terminal-border pt-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
          Volume
        </p>
        <p className="mt-0.5 font-mono text-sm tabular-nums text-zinc-400">
          {volumeValue}{" "}
          <span className="text-[10px] text-zinc-600">{volumeUnit}</span>
        </p>
      </div>
    </div>
  );
}
