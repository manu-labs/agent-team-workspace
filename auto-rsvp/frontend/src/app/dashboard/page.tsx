"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RSVP, RSVPStatus } from "@/lib/types";
import {
  getRSVPs,
  retryRSVP,
  skipRSVP,
  triggerAutoRSVP,
  triggerMatch,
} from "@/lib/api";
import RSVPStatusBadge from "@/components/RSVPStatusBadge";

// ── Section configuration ────────────────────────────────────────────────────

const SECTIONS: {
  key: string;
  label: string;
  statuses: RSVPStatus[];
}[] = [
  {
    key: "action",
    label: "Action Required",
    statuses: ["failed", "manual_required"],
  },
  { key: "upcoming", label: "Upcoming", statuses: ["success"] },
  {
    key: "pending",
    label: "Pending",
    statuses: ["pending", "in_progress"],
  },
  {
    key: "history",
    label: "History",
    statuses: ["already_full", "skipped"],
  },
];

const PLATFORM_COLORS: Record<string, string> = {
  eventbrite: "bg-orange-500/10 text-orange-400",
  luma: "bg-purple-500/10 text-purple-400",
  splashthat: "bg-cyan-500/10 text-cyan-400",
  partiful: "bg-pink-500/10 text-pink-400",
};

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ── RSVP row ─────────────────────────────────────────────────────────────────

function RSVPRow({
  rsvp,
  retrying,
  onRetry,
  onSkip,
}: {
  rsvp: RSVP;
  retrying: boolean;
  onRetry: () => void;
  onSkip: () => void;
}) {
  const event = rsvp.event;
  const platformKey = (event?.platform || "").toLowerCase();
  const platformClass =
    PLATFORM_COLORS[platformKey] || "bg-zinc-500/10 text-zinc-400";

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="truncate font-medium text-white">
            {event?.title || "Unknown Event"}
          </h3>
          <RSVPStatusBadge status={rsvp.status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          {event?.date && <span>{event.date}</span>}
          {event?.platform && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${platformClass}`}
            >
              {event.platform}
            </span>
          )}
          <span className="text-zinc-600">
            Match: {Math.round(rsvp.match_score * 100)}%
          </span>
        </div>
        {rsvp.match_reason && (
          <p className="mt-1 text-xs text-zinc-500">{rsvp.match_reason}</p>
        )}
        {rsvp.status === "failed" && rsvp.error_message && (
          <p className="mt-1 text-xs text-red-400">{rsvp.error_message}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {(rsvp.status === "failed" || rsvp.status === "manual_required") && (
          <>
            <button
              onClick={onRetry}
              disabled={retrying}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-50"
            >
              {retrying ? "Retrying..." : "Retry"}
            </button>
            <button
              onClick={onSkip}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Skip
            </button>
          </>
        )}
        {rsvp.status === "manual_required" && event?.rsvp_url && (
          <a
            href={event.rsvp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            RSVP Manually
          </a>
        )}
        {rsvp.status === "success" && event?.rsvp_url && (
          <a
            href={event.rsvp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            View &rarr;
          </a>
        )}
      </div>
    </div>
  );
}

// ── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState(false);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

  const userId =
    typeof window !== "undefined"
      ? localStorage.getItem("user_id")
      : null;

  const fetchRSVPs = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const data = await getRSVPs(userId);
      setRsvps(data);
      setError(null);
    } catch {
      setError("Failed to load RSVPs.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRSVPs();
  }, [fetchRSVPs]);

  // Auto-refresh every 30s when any RSVPs are in_progress or pending
  const hasInProgress = rsvps.some(
    (r) => r.status === "in_progress" || r.status === "pending"
  );

  useEffect(() => {
    if (!hasInProgress) return;
    const interval = setInterval(fetchRSVPs, 30_000);
    return () => clearInterval(interval);
  }, [hasInProgress, fetchRSVPs]);

  // Group RSVPs by section
  const grouped = useMemo(() => {
    const map: Record<string, RSVP[]> = {};
    for (const section of SECTIONS) {
      map[section.key] = rsvps.filter((r) =>
        (section.statuses as string[]).includes(r.status)
      );
    }
    return map;
  }, [rsvps]);

  // Summary stats
  const stats = useMemo(
    () => ({
      total: rsvps.length,
      success: rsvps.filter((r) => r.status === "success").length,
      pending: rsvps.filter(
        (r) => r.status === "pending" || r.status === "in_progress"
      ).length,
      failed: rsvps.filter(
        (r) => r.status === "failed" || r.status === "manual_required"
      ).length,
    }),
    [rsvps]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleRunNow = async () => {
    if (!userId) return;
    setRunningJob(true);
    try {
      await triggerMatch(userId);
      await triggerAutoRSVP();
      await fetchRSVPs();
    } catch {
      setError("Failed to run auto-RSVP pipeline.");
    } finally {
      setRunningJob(false);
    }
  };

  const handleRetry = async (rsvpId: string) => {
    setRetrying((prev) => new Set(prev).add(rsvpId));
    try {
      const updated = await retryRSVP(rsvpId);
      setRsvps((prev) =>
        prev.map((r) => (r.id === rsvpId ? updated : r))
      );
    } catch {
      setError("Retry failed. Try again.");
    } finally {
      setRetrying((prev) => {
        const next = new Set(prev);
        next.delete(rsvpId);
        return next;
      });
    }
  };

  const handleSkip = async (rsvpId: string) => {
    try {
      const updated = await skipRSVP(rsvpId);
      setRsvps((prev) =>
        prev.map((r) => (r.id === rsvpId ? updated : r))
      );
    } catch {
      // Silently fail on skip — not critical
    }
  };

  // ── No user state ────────────────────────────────────────────────────────

  if (!userId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">RSVP Dashboard</h1>
        <p className="mt-4 text-zinc-400">
          Sign up first to see your matched events and RSVP statuses.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-zinc-800" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-zinc-800" />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-zinc-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main dashboard ───────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">RSVP Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track all your auto-RSVPs and their statuses.
          </p>
        </div>
        <button
          onClick={handleRunNow}
          disabled={runningJob}
          className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {runningJob ? "Running..." : "Run Auto-RSVP Now"}
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Matched" value={stats.total} color="text-white" />
        <StatCard
          label="Successful"
          value={stats.success}
          color="text-green-400"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          color="text-yellow-400"
        />
        <StatCard label="Failed" value={stats.failed} color="text-red-400" />
      </div>

      {/* Auto-refresh indicator */}
      {hasInProgress && (
        <p className="mt-4 text-xs text-zinc-500">
          Auto-refreshing every 30s while RSVPs are in progress...
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Empty state */}
      {rsvps.length === 0 && !error && (
        <div className="mt-12 text-center">
          <p className="text-lg text-zinc-400">No matched events yet.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Click &quot;Run Auto-RSVP Now&quot; to match events to your
            interests and start auto-signing up.
          </p>
        </div>
      )}

      {/* Sections */}
      {SECTIONS.map((section) => {
        const items = grouped[section.key];
        if (!items || items.length === 0) return null;
        return (
          <div key={section.key} className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {section.label}{" "}
              <span className="text-sm font-normal text-zinc-500">
                ({items.length})
              </span>
            </h2>
            <div className="grid gap-3">
              {items.map((rsvp) => (
                <RSVPRow
                  key={rsvp.id}
                  rsvp={rsvp}
                  retrying={retrying.has(rsvp.id)}
                  onRetry={() => handleRetry(rsvp.id)}
                  onSkip={() => handleSkip(rsvp.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
