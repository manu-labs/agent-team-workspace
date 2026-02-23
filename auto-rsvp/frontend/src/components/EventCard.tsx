import { Event, RSVPStatus } from "@/lib/types";
import RSVPStatusBadge from "./RSVPStatusBadge";

const PLATFORM_COLORS: Record<string, string> = {
  eventbrite: "bg-orange-500/10 text-orange-400",
  luma: "bg-purple-500/10 text-purple-400",
  splashthat: "bg-cyan-500/10 text-cyan-400",
  partiful: "bg-pink-500/10 text-pink-400",
};

interface EventCardProps {
  event: Event;
  matchScore?: number;
  rsvpStatus?: RSVPStatus;
}

export default function EventCard({
  event,
  matchScore,
  rsvpStatus,
}: EventCardProps) {
  const platformKey = event.platform.toLowerCase();
  const platformClass =
    PLATFORM_COLORS[platformKey] || "bg-zinc-500/10 text-zinc-400";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-medium text-white">{event.title}</h3>
        {rsvpStatus && <RSVPStatusBadge status={rsvpStatus} />}
      </div>
      <div className="flex items-center gap-3 text-sm text-zinc-400">
        <span>{event.date}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${platformClass}`}
        >
          {event.platform}
        </span>
      </div>
      {matchScore !== undefined && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full ${
                  matchScore > 0.7
                    ? "bg-green-500"
                    : matchScore > 0.4
                      ? "bg-yellow-500"
                      : "bg-zinc-600"
                }`}
                style={{ width: `${Math.round(matchScore * 100)}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500">
              {Math.round(matchScore * 100)}%
            </span>
          </div>
        </div>
      )}
      <a
        href={event.rsvp_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300"
      >
        View Event &rarr;
      </a>
    </div>
  );
}
