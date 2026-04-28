"use client";

import { EventResponse, EventStatus } from "@/lib/api/types";

const STATUS_STYLES: Record<EventStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 border border-amber-200",
  REJECTED: "bg-red-50 text-red-700 border border-red-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  NOMINATIONS_OPEN: "bg-blue-50 text-blue-700 border border-blue-200",
  NOMINATIONS_CLOSED: "bg-slate-100 text-slate-600",
  VOTING_SCHEDULED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  VOTING_LIVE: "bg-green-50 text-green-700 border border-green-200",
  VOTING_CLOSED: "bg-slate-100 text-slate-600",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

function statusLabel(status: EventStatus): string {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AllEventsTable({ events }: { events: EventResponse[] }) {
  if (events.length === 0) {
    return (
      <p className="mt-10 text-sm text-ink/45">No events found.</p>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-canvas text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">
            <th className="px-5 py-3.5">Event</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5">Categories</th>
            <th className="px-5 py-3.5">Voting start</th>
            <th className="px-5 py-3.5">Submitted</th>
            <th className="px-5 py-3.5">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {events.map((event) => (
            <tr key={event.id} className="transition hover:bg-primary/3">
              <td className="px-5 py-4">
                <p className="font-medium text-ink">{event.name}</p>
                <p className="mt-0.5 font-mono text-[10px] text-ink/35">
                  {event.id}
                </p>
              </td>
              <td className="px-5 py-4">
                <span
                  className={[
                    "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    STATUS_STYLES[event.status],
                  ].join(" ")}
                >
                  {statusLabel(event.status)}
                </span>
              </td>
              <td className="px-5 py-4 text-ink/65">
                {event.categories.length}
              </td>
              <td className="px-5 py-4 text-ink/65">
                {formatDate(event.votingStartAt)}
              </td>
              <td className="px-5 py-4 text-ink/65">
                {formatDate(event.submittedAt)}
              </td>
              <td className="px-5 py-4 text-ink/65">
                {formatDate(event.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
