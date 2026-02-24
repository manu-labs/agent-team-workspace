interface PlatformCardProps {
  name: "Polymarket" | "Kalshi";
  yes: number;
  no: number;
  volume: number;
  url: string;
  /** Highlight this platform as the buy side */
  buyHere?: boolean;
}

function fmt(n: number): string {
  return (n * 100).toFixed(1) + "\u00a2";
}

function fmtVolume(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

export default function PlatformCard({
  name,
  yes,
  no,
  volume,
  url,
  buyHere,
}: PlatformCardProps) {
  return (
    <div
      className={[
        "flex flex-col border bg-terminal-surface p-4",
        buyHere ? "border-profit/40" : "border-terminal-border",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-300">
            {name}
          </h3>
          {buyHere && (
            <span className="border border-profit/40 bg-profit/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-profit">
              Buy here
            </span>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] uppercase tracking-wider text-accent transition-colors hover:underline"
        >
          Open \u2197
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
          {fmtVolume(volume)}
        </p>
      </div>
    </div>
  );
}