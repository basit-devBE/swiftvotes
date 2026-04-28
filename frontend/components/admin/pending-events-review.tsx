"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api/client";
import { approveEvent, listPendingEvents, rejectEvent } from "@/lib/api/events";
import { EventResponse } from "@/lib/api/types";

export function PendingEventsReview() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      try {
        const result = await listPendingEvents();
        if (!cancelled) {
          setEvents(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load pending events.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (user?.systemRole === "SUPER_ADMIN") {
      void load();
    }

    return () => {
      cancelled = true;
    };
  }, [user?.systemRole]);

  if (error) {
    return (
      <div className="rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-ink/40">Loading pending events…</p>;
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white px-6 py-10 text-center">
        <p className="text-sm font-medium text-ink/50">
          No events pending review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {events.map((event) => (
        <div
          key={event.id}
          className="rounded-[1.6rem] border border-primary/12 bg-white p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                Pending approval
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
                {event.name}
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink/62">
                {event.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink/50">
                <span>{event.categories.length} categories</span>
                <span>·</span>
                <span>
                  Voting starts{" "}
                  {new Date(event.votingStartAt).toLocaleDateString()}
                </span>
                {event.submittedAt && (
                  <>
                    <span>·</span>
                    <span>
                      Submitted{" "}
                      {new Date(event.submittedAt).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[13rem]">
              <button
                type="button"
                className="button-primary"
                onClick={async () => {
                  const result = await approveEvent(event.id);
                  setEvents((current) =>
                    current.filter((item) => item.id !== result.id),
                  );
                }}
              >
                Approve
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() =>
                  setActiveRejectId((current) =>
                    current === event.id ? null : event.id,
                  )
                }
              >
                Reject
              </button>
            </div>
          </div>

          {activeRejectId === event.id ? (
            <div className="mt-6 border-t border-primary/10 pt-6">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink/74">
                  Rejection reason
                </span>
                <textarea
                  className="min-h-[7rem] w-full rounded-[1.2rem] border border-ink/10 bg-white/90 px-4 py-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-blue-100"
                  value={rejectionReason}
                  placeholder="Explain why this event is being rejected…"
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </label>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  className="button-primary"
                  onClick={async () => {
                    const result = await rejectEvent(
                      event.id,
                      rejectionReason,
                    );
                    setEvents((current) =>
                      current.filter((item) => item.id !== result.id),
                    );
                    setRejectionReason("");
                    setActiveRejectId(null);
                  }}
                >
                  Confirm rejection
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    setActiveRejectId(null);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

