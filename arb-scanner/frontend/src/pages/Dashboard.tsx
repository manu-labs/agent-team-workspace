import MatchTable from "../components/MatchTable";

export default function Dashboard() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-bold uppercase tracking-wider text-zinc-100">
            Live Opportunities
          </h1>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Sorted by volume &middot; Auto-refreshes every 5s
          </p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-profit opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-profit" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Live
          </span>
        </div>
      </div>

      {/* Matches table */}
      <div className="border border-terminal-border bg-terminal-surface">
        <MatchTable />
      </div>
    </div>
  );
}
