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

  if (user?.systemRole !== "SUPER_ADMIN") {
    return (
      <div className="mx-auto max-w-3xl border-t border-primary/12 pt-10">
        <p className="section-kicker">Admin review</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
          This view is reserved for the super admin.
        </h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <div className="border-b border-primary/12 pb-10">
        <p className="section-kicker">Admin review</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.045em] text-ink sm:text-5xl lg:text-[4.1rem]">
          Pending event approvals.
        </h1>
      </div>

      {error ? (
        <div className="mt-8 rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-10 text-base text-ink/56">Loading pending events...</p>
      ) : null}

      <div className="mt-10 space-y-8">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-[1.6rem] border border-primary/12 bg-white/72 p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                  Pending approval
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  {event.name}
                </h2>
                <p className="mt-4 text-base leading-7 text-ink/62">
                  {event.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm text-ink/54">
                  <span>{event.categories.length} categories</span>
                  <span>•</span>
                  <span>
                    Voting starts {new Date(event.votingStartAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:min-w-[15rem]">
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
                    className="min-h-[7rem] w-full rounded-[1.2rem] border border-ink/10 bg-white/90 px-4 py-4 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-blue-100"
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                  />
                </label>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    className="button-primary"
                    onClick={async () => {
                      const result = await rejectEvent(event.id, rejectionReason);
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
    </div>
  );
}
