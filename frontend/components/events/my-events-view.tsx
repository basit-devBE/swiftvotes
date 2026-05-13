"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppLoadingState } from "@/components/app-loading-state";
import { ApiClientError } from "@/lib/api/client";
import { listMyEvents } from "@/lib/api/events";
import { EventResponse, EventStatus } from "@/lib/api/types";

const OWNER_STATUS_FILTERS: Array<"all" | EventStatus> = [
  "all",
  "DRAFT",
  "PENDING_APPROVAL",
  "REJECTED",
  "NOMINATIONS_OPEN",
  "VOTING_LIVE",
  "VOTING_CLOSED",
];

function formatStatus(status: EventStatus): string {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusBadgeClass(status: EventStatus): string {
  if (status === "VOTING_LIVE") return "bg-primary text-white";
  if (status === "REJECTED") return "bg-accent/8 text-accent";
  if (status === "PENDING_APPROVAL") return "bg-amber-50 text-amber-700";
  if (status === "NOMINATIONS_OPEN") return "bg-emerald-50 text-emerald-700";
  if (status === "DRAFT") return "bg-slate-100 text-slate-600";
  return "bg-primary/8 text-primary";
}

function eventMatches(event: EventResponse, query: string, status: "all" | EventStatus) {
  const normalized = query.trim().toLowerCase();
  if (status !== "all" && event.status !== status) return false;
  if (!normalized) return true;

  return [event.name, event.description, event.status, ...event.categories.map((c) => c.name)]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function MyEventsView() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await listMyEvents();
        if (!cancelled) setEvents(result);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load your events.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const pending = events.filter((event) => event.status === "PENDING_APPROVAL").length;
    const live = events.filter((event) => event.status === "VOTING_LIVE").length;
    const drafts = events.filter((event) => event.status === "DRAFT").length;
    const rejected = events.filter((event) => event.status === "REJECTED").length;
    return { pending, live, drafts, rejected };
  }, [events]);

  const filteredEvents = useMemo(
    () => events.filter((event) => eventMatches(event, query, statusFilter)),
    [events, query, statusFilter],
  );

  const leadEvent = filteredEvents[0] ?? events[0] ?? null;
  const listEvents = leadEvent
    ? filteredEvents.filter((event) => event.id !== leadEvent.id)
    : filteredEvents;

  return (
    <div className="mx-auto max-w-[1320px] pb-16">
      <section className="overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_24px_60px_rgba(7,17,31,0.06)]">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,76,219,0.14),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(180,15,23,0.08),transparent_32%)]" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                Event workspace
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[0.96] text-ink sm:text-5xl lg:text-[4.5rem]">
                Keep every event moving toward approval and voting day.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink/62 sm:text-lg">
                See which drafts still need work, which events are waiting for review,
                and which campaigns are already taking nominations or votes.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-4">
                <WorkspaceStat label="Total" value={events.length} />
                <WorkspaceStat label="Drafts" value={stats.drafts} />
                <WorkspaceStat label="Pending" value={stats.pending} />
                <WorkspaceStat label="Live" value={stats.live} />
              </div>
            </div>
          </div>

          <div className="border-t border-line bg-[#f8fafc] p-6 xl:border-l xl:border-t-0">
            <div className="rounded-[1.5rem] bg-ink p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Next action
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-none text-white">
                Start the next voting campaign.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Add the flyer, categories, prices, nominations, and voting dates before sending it to admin review.
              </p>
              <Link
                href="/events/create"
                className="mt-6 inline-flex rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-primary hover:text-white"
              >
                Create event
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat label="Rejected" value={stats.rejected} />
              <MiniStat label="Reviews" value={stats.pending} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[1.5rem] border border-line bg-white p-4 shadow-[0_18px_45px_rgba(7,17,31,0.045)] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto] lg:items-center">
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/32"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your events or categories"
              className="h-11 w-full rounded-xl border border-line bg-[#f8fafc] pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-primary focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <Link
            href="/events"
            className="rounded-xl border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink/62 transition hover:border-primary/35 hover:bg-primary/5 hover:text-primary"
          >
            Public events
          </Link>
          <Link
            href="/events/create"
            className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-deep"
          >
            Create event
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-line/70 pt-4">
          {OWNER_STATUS_FILTERS.map((status) => {
            const active = statusFilter === status;
            const count =
              status === "all"
                ? events.length
                : events.filter((event) => event.status === status).length;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={[
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-white text-ink/58 hover:border-primary/35 hover:text-ink",
                ].join(" ")}
              >
                {status === "all" ? "All" : formatStatus(status)}
                <span className={active ? "ml-1.5 opacity-75" : "ml-1.5 text-ink/38"}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {error ? (
        <div className="mt-5 rounded-2xl border border-accent/20 bg-accent/5 px-5 py-4 text-sm font-medium text-accent">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6">
          <AppLoadingState
            compact
            label="Loading your events"
            detail="Fetching drafts, reviews, and live campaigns."
          />
        </div>
      ) : null}

      {!isLoading && filteredEvents.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-line bg-white p-10 text-center">
          <p className="font-display text-2xl font-semibold text-ink">No events match this workspace view</p>
          <p className="mt-2 text-sm text-ink/50">
            Clear the filters, search by event name, or start a new campaign draft.
          </p>
          <Link
            href="/events/create"
            className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-deep"
          >
            Create event
          </Link>
        </div>
      ) : null}

      {leadEvent ? <LeadEventCard event={leadEvent} /> : null}

      {listEvents.length > 0 ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {listEvents.map((event) => (
            <OwnerEventCard key={event.id} event={event} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-white/78 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/38">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/38">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function LeadEventCard({ event }: { event: EventResponse }) {
  return (
    <Link
      href={`/events/${event.id}/manage`}
      className="group mt-6 grid overflow-hidden rounded-[1.5rem] border border-line bg-white shadow-[0_20px_50px_rgba(7,17,31,0.055)] transition hover:-translate-y-0.5 hover:border-primary/30 lg:grid-cols-[360px_minmax(0,1fr)]"
    >
      <div className="relative min-h-[280px] bg-[#eef2f7]">
        <Image
          src={event.primaryFlyerUrl}
          alt={event.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 1024px) 100vw, 360px"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.02),rgba(7,17,31,0.44))]" />
      </div>
      <div className="flex flex-col p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(event.status)}`}>
            {formatStatus(event.status)}
          </span>
          <span className="text-sm font-semibold text-primary">Manage event</span>
        </div>
        <h2 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-none text-ink">
          {event.name}
        </h2>
        <p className="mt-4 max-w-2xl line-clamp-3 text-base leading-7 text-ink/60">
          {event.description}
        </p>
        <div className="mt-auto grid gap-3 pt-8 sm:grid-cols-3">
          <EventDatum label="Categories" value={String(event.categories.length)} />
          <EventDatum label="Voting starts" value={formatDate(event.votingStartAt)} />
          <EventDatum label="Voting ends" value={formatDate(event.votingEndAt)} />
        </div>
      </div>
    </Link>
  );
}

function OwnerEventCard({ event }: { event: EventResponse }) {
  return (
    <Link
      href={`/events/${event.id}/manage`}
      className="group grid overflow-hidden rounded-[1.5rem] border border-line bg-white shadow-[0_18px_45px_rgba(7,17,31,0.045)] transition hover:-translate-y-0.5 hover:border-primary/30 sm:grid-cols-[180px_minmax(0,1fr)]"
    >
      <div className="relative min-h-[180px] bg-[#eef2f7]">
        <Image
          src={event.primaryFlyerUrl}
          alt={event.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, 180px"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.02),rgba(7,17,31,0.34))]" />
      </div>
      <div className="flex min-w-0 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(event.status)}`}>
            {formatStatus(event.status)}
          </span>
          <span className="text-sm font-semibold text-ink/45 transition group-hover:text-primary">
            Manage
          </span>
        </div>
        <h2 className="mt-4 line-clamp-2 font-display text-3xl font-semibold leading-none text-ink">
          {event.name}
        </h2>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/58">
          {event.description}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
          <EventDatum label="Categories" value={String(event.categories.length)} />
          <EventDatum label="Voting" value={formatDate(event.votingStartAt)} />
        </div>
      </div>
    </Link>
  );
}

function EventDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/35">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
