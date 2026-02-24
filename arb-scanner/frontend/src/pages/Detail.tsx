import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getMatch } from "../lib/api";
import type { Match } from "../lib/types";
import MatchDetail from "../components/MatchDetail";

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === undefined) return;
    setLoading(true);
    setError(null);
    getMatch(id)
      .then(setMatch)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load match");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-24 animate-pulse bg-terminal-muted" />
        <div className="h-6 w-3/4 animate-pulse bg-terminal-muted" />
        <div className="h-20 animate-pulse bg-terminal-surface border border-terminal-border" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 animate-pulse border border-terminal-border bg-terminal-surface" />
          <div className="h-32 animate-pulse border border-terminal-border bg-terminal-surface" />
        </div>
      </div>
    );
  }

  if (error !== null || match === null) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Link
          to="/"
          className="font-mono text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
        >
          &larr; Back to dashboard
        </Link>
        <p className="font-mono text-sm text-loss">
          {error ?? "Match not found"}
        </p>
      </div>
    );
  }

  return <MatchDetail match={match} />;
}
