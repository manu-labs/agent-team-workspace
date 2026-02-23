import { RSVPStatus } from "@/lib/types";

const STATUS_CONFIG: Record<RSVPStatus, { label: string; className: string }> = {
  success: { label: "RSVPd", className: "bg-green-500/10 text-green-400" },
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-400" },
  in_progress: {
    label: "Signing up...",
    className: "bg-blue-500/10 text-blue-400",
  },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-400" },
  already_full: {
    label: "Event Full",
    className: "bg-zinc-500/10 text-zinc-400",
  },
  manual_required: {
    label: "Manual RSVP",
    className: "bg-amber-500/10 text-amber-400",
  },
  skipped: { label: "Skipped", className: "bg-zinc-500/10 text-zinc-500" },
};

interface RSVPStatusBadgeProps {
  status: RSVPStatus;
}

export default function RSVPStatusBadge({ status }: RSVPStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
