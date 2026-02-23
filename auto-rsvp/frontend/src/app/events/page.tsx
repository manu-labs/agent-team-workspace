"use client";

import { useState, useEffect, useCallback } from "react";
import EventCard from "@/components/EventCard";
import { getEvents, getRSVPs, triggerMatch, triggerScrape } from "@/lib/api";
import { Event, RSVP, RSVPStatus } from "@/lib/types";

const PLATFORMS = ["All", "Eventbrite", "Lu.ma", "Splashthat", "Partiful"];
const PAGE_SIZE = 20;

// Date range for SXSW 2026: March 7-15
const DATE_BUTTONS = [
  { label: "All dates", value: "" },
  { label: "Mar 7", value: "2026-03-07" },
  { label: "Mar 8", value: "2026-03-08" },
  { label: "Mar 9", value: "2026-03-09" },
  { label: "Mar 10", value: "2026-03-10" },
  { label: "Mar 11", value: "2026-03-11" },
  { label: "Mar 12", value: "2026-03-12" },
  { label: "Mar 13", value: "2026-03-13" },
  { label: "Mar 14", value: "2026-03-14" },
  { label: "Mar 15", value: "2026-03-15" },
];

const MATCH_FILTERS = [
  { label: "All events", value: "all" },
  { label: "Matched only", value: "matched" },
  { label: "High match (>70%)", value: "high" },
];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvpMap, setRsvpMap] = useState<Record<string, RSVP>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState<"match" | "scrape" | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [matchFilter, setMatchFilter] = useState("all");

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  // Load RSVPs for the current user once
  useEffect(() => {
    if (!userId) return;
    getRSVPs(userId)
      .then((rsvps) => {
        const map: Record<string, RSVP> = {};
        for (const r of rsvps) map[r.event_id] = r;
        setRsvpMap(map);
      })
      .catch(() => {});
  }, [userId]);

  // Fetch page 1 whenever filters change
  const fetchPage1 = useCallback(async () => {
    setLoading(true);
    setPage(1);
    try {
      const params: Parameters<typeof getEvents>[0] = {
        page: 1,
        limit: PAGE_SIZE,
        search: search || undefined,
        platform: platform !== "All" ? platform.toLowerCase() : undefined,
      };
      const data = await getEvents(params);
      setEvents(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [search, platform]);

  useEffect(() => {
    fetchPage1();
  }, [fetchPage1]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const data = await getEvents({
        page: nextPage,
        limit: PAGE_SIZE,
        search: search || undefined,
        platform: platform !== "All" ? platform.toLowerCase() : undefined,
      });
      setEvents((prev) => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleMatch() {
    if (!userId) return;
    setActionLoading("match");
    setActionMsg(null);
    try {
      const res = await triggerMatch(userId);
      setActionMsg(res.message || "Matching complete! Refresh to see scores.");
      // Reload RSVPs to pick up new match scores
      const rsvps = await getRSVPs(userId);
      const map: Record<string, RSVP> = {};
      for (const r of rsvps) map[r.event_id] = r;
      setRsvpMap(map);
    } catch {
      setActionMsg("Matching failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleScrape() {
    setActionLoading("scrape");
    setActionMsg(null);
    try {
      const res = await triggerScrape();
      setActionMsg(res.message || "Scrape started! Events will refresh shortly.");
      // Reload events after scrape
      await fetchPage1();
    } catch {
      setActionMsg("Scrape failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  // Client-side filter: date and match score (not supported by backend query params)
  const filtered = events.filter((event) => {
    if (dateFilter && !event.date.startsWith(dateFilter)) return false;
    if (matchFilter !== "all") {
      const rsvp = rsvpMap[event.id];
      if (!rsvp) return false;
      if (matchFilter === "high" && rsvp.match_score <= 0.7) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Events</h1>
          <p className="text-sm text-zinc-400">
            Scraped from rsvpatx.com · SXSW 2026
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleScrape}
            disabled={!!actionLoading}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white disabled:opacity-50"
          >
            {actionLoading === "scrape" ? "Scraping..." : "Refresh Events"}
          </button>
          {userId && (
            <button
              onClick={handleMatch}
              disabled={!!actionLoading}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {actionLoading === "match" ? "Matching..." : "Match My Events"}
            </button>
          )}
        </div>
      </div>

      {/* Action feedback */}
      {actionMsg && (
        <div className="mb-4 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
          {actionMsg}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 space-y-3">
        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Platform chips */}
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                platform === p
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Date buttons */}
        <div className="flex flex-wrap gap-2">
          {DATE_BUTTONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDateFilter(d.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                dateFilter === d.value
                  ? "bg-zinc-600 text-white"
                  : "bg-zinc-800 text-zinc-500 hover:text-white"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Match filter (only if logged in) */}
        {userId && (
          <div className="flex flex-wrap gap-2">
            {MATCH_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setMatchFilter(f.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  matchFilter === f.value
                    ? "bg-green-700 text-white"
                    : "bg-zinc-800 text-zinc-500 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-zinc-500">
          <p className="text-lg">No events found.</p>
          <p className="mt-1 text-sm">Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-zinc-600">
            {filtered.length} event{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== events.length && ` (filtered from ${events.length})`}
          </p>
          <div className="space-y-3">
            {filtered.map((event) => {
              const rsvp = rsvpMap[event.id];
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  matchScore={rsvp?.match_score}
                  rsvpStatus={rsvp?.status as RSVPStatus | undefined}
                />
              );
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-md border border-zinc-700 px-6 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
