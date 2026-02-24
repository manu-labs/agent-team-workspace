interface SpreadBadgeProps {
  spread: number; // fee_adjusted_spread in decimal (e.g. 0.0332)
  /** Show as inline badge (default) or full-width block */
  block?: boolean;
}

function formatSpread(spread: number): string {
  return (spread * 100).toFixed(1) + "\u00a2";
}

/** Returns Tailwind classes for the badge based on spread tier */
function spreadTier(spread: number): {
  wrapper: string;
  text: string;
  glow: boolean;
} {
  if (spread > 0.05) {
    return {
      wrapper: "bg-profit/15 border border-profit/40",
      text: "text-profit",
      glow: true,
    };
  }
  if (spread >= 0.03) {
    return {
      wrapper: "bg-profit/8 border border-profit/20",
      text: "text-profit",
      glow: false,
    };
  }
  if (spread >= 0.01) {
    return {
      wrapper: "bg-profit/[0.04] border border-profit/10",
      text: "text-profit/70",
      glow: false,
    };
  }
  return {
    wrapper: "border border-terminal-border",
    text: "text-zinc-500",
    glow: false,
  };
}

export default function SpreadBadge({ spread, block }: SpreadBadgeProps) {
  const tier = spreadTier(spread);
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5",
        "font-mono text-sm tabular-nums tracking-tight",
        tier.wrapper,
        tier.text,
        tier.glow ? "profit-glow" : "",
        block ? "w-full justify-center" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {formatSpread(spread)}
    </span>
  );
}

/** Returns a subtle row background class for the spread tier — used by MatchRow */
export function spreadRowBg(spread: number): string {
  if (spread > 0.05) return "bg-profit/[0.06]";
  if (spread >= 0.03) return "bg-profit/[0.03]";
  return "";
}
