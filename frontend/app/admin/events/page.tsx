"use client";

import { useEffect, useState } from "react";

import { AllEventsTable } from "@/components/admin/all-events-table";
import { PendingEventsReview } from "@/components/admin/pending-events-review";
import { listAllAdminEvents } from "@/lib/api/events";
import { EventResponse } from "@/lib/api/types";

type Tab = "pending" | "all";

export default function AdminEventsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [allEvents, setAllEvents] = useState<EventResponse[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [loadedAll, setLoadedAll] = useState(false);

  useEffect(() => {
    if (tab === "all" && !loadedAll) {
      let cancelled = false;

      async function loadAllEvents() {
        setIsLoadingAll(true);
        try {
          const events = await listAllAdminEvents();
          if (cancelled) return;
          setAllEvents(events);
          setLoadedAll(true);
        } finally {
          if (!cancelled) setIsLoadingAll(false);
        }
      }

      void loadAllEvents();
      return () => {
        cancelled = true;
      };
    }
  }, [tab, loadedAll]);

  return (
    <div className="px-8 py-10">
      {/* Header */}
      <div className="mb-8 border-b border-line pb-8">
        <p className="section-kicker">Events</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
          Event management
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-line bg-white p-1 w-fit">
        {(
          [
            { key: "pending", label: "Pending Review" },
            { key: "all", label: "All Events" },
          ] as { key: Tab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              "rounded-xl px-5 py-2 text-sm font-semibold transition",
              tab === key
                ? "bg-ink text-white shadow-sm"
                : "text-ink/50 hover:text-ink",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <div className="mt-6">
          <PendingEventsReview />
        </div>
      )}

      {tab === "all" && (
        <div className="mt-2">
          {isLoadingAll ? (
            <p className="mt-6 text-sm text-ink/40">Loading events…</p>
          ) : (
            <AllEventsTable events={allEvents} />
          )}
        </div>
      )}
    </div>
  );
}
