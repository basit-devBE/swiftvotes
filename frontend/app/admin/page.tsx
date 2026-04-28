"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { listAllAdminEvents, listPendingEvents } from "@/lib/api/events";
import { listUsers } from "@/lib/api/users";
import { EventResponse, EventStatus, UserResponse } from "@/lib/api/types";

function StatCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className={[
        "rounded-2xl border bg-white px-6 py-5 transition",
        accent
          ? "border-accent/20 bg-accent/4"
          : "border-line hover:border-primary/20",
        href ? "cursor-pointer hover:shadow-soft" : "",
      ].join(" ")}
    >
      <p className="text-sm font-medium text-ink/50">{label}</p>
      <p
        className={[
          "mt-1.5 font-display text-4xl font-semibold tracking-tight",
          accent ? "text-accent" : "text-primary",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

function statusLabel(status: EventStatus): string {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [pending, setPending] = useState<EventResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [allEvents, pendingEvents, allUsers] = await Promise.all([
        listAllAdminEvents(),
        listPendingEvents(),
        listUsers(),
      ]);

      if (!cancelled) {
        setEvents(allEvents);
        setPending(pendingEvents);
        setUsers(allUsers);
        setIsLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const activeUsers = users.filter((u) => u.status === "ACTIVE").length;

  return (
    <div className="px-8 py-10">
      {/* Header */}
      <div className="mb-8 border-b border-line pb-8">
        <p className="section-kicker">Admin panel</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
          Overview
        </h1>
        <p className="mt-1.5 text-sm text-ink/50">
          Platform-wide snapshot. Last loaded now.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink/40">Loading stats…</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Pending Review"
              value={pending.length}
              accent={pending.length > 0}
              href="/admin/events"
            />
            <StatCard label="Total Events" value={events.length} href="/admin/events" />
            <StatCard label="Total Users" value={users.length} href="/admin/users" />
            <StatCard label="Active Users" value={activeUsers} />
          </div>

          {/* Pending events preview */}
          {pending.length > 0 && (
            <div className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold tracking-[-0.03em] text-ink">
                  Awaiting review
                </h2>
                <Link
                  href="/admin/events"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {pending.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">{event.name}</p>
                      <p className="mt-0.5 text-xs text-ink/45">
                        {event.categories.length} categories ·{" "}
                        Submitted{" "}
                        {event.submittedAt
                          ? new Date(event.submittedAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <Link
                      href="/admin/events"
                      className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-deep"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event status breakdown */}
          {events.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 font-display text-lg font-semibold tracking-[-0.03em] text-ink">
                Events by status
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {(
                  [
                    "DRAFT",
                    "PENDING_APPROVAL",
                    "APPROVED",
                    "VOTING_LIVE",
                    "ARCHIVED",
                  ] as EventStatus[]
                ).map((s) => {
                  const count = events.filter((e) => e.status === s).length;
                  return (
                    <div
                      key={s}
                      className="rounded-xl border border-line bg-white px-4 py-3"
                    >
                      <p className="text-xs font-medium text-ink/45">
                        {statusLabel(s)}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-ink">
                        {count}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
