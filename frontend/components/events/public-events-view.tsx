"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppLoadingState } from "@/components/app-loading-state";
import { ApiClientError } from "@/lib/api/client";
import { listApprovedEvents } from "@/lib/api/events";
import { EventResponse, EventStatus } from "@/lib/api/types";

const STATUS_OPTIONS: Array<"all" | EventStatus> = [
  "all",
  "VOTING_LIVE",
  "VOTING_SCHEDULED",
  "NOMINATIONS_OPEN",
  "APPROVED",
  "VOTING_CLOSED",
];

function formatStatus(status: string): string {
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

function statusClass(status: EventStatus): string {
  if (status === "VOTING_LIVE") return "bg-primary text-white";
  if (status === "NOMINATIONS_OPEN") return "bg-emerald-50 text-emerald-700";
  if (status === "VOTING_SCHEDULED") return "bg-amber-50 text-amber-700";
  if (status === "VOTING_CLOSED") return "bg-slate-100 text-slate-600";
  return "bg-primary/8 text-primary";
}

function eventMatches(event: EventResponse, query: string, status: "all" | EventStatus) {
  const normalized = query.trim().toLowerCase();
  const matchesStatus = status === "all" || event.status === status;
  if (!matchesStatus) return false;
  if (!normalized) return true;

  return [
    event.name,
    event.description,
    event.status,
    ...event.categories.map((category) => category.name),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function PublicEventsView() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await listApprovedEvents();
        if (!cancelled) setEvents(result);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load approved events.",
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

  const filteredEvents = useMemo(
    () => events.filter((event) => eventMatches(event, query, statusFilter)),
    [events, query, statusFilter],
  );

  const featured = filteredEvents[0] ?? events[0] ?? null;
  const remaining = featured
    ? filteredEvents.filter((event) => event.id !== featured.id)
    : filteredEvents;
  const liveCount = events.filter((event) => event.status === "VOTING_LIVE").length;
  const nominationCount = events.filter((event) => event.status === "NOMINATIONS_OPEN").length;

  return (
    <div className="mx-auto max-w-[1320px] pb-16">
      <section className="overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_24px_60px_rgba(7,17,31,0.06)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,76,219,0.14),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(245,161,59,0.12),transparent_32%)]" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                Event directory
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[0.96] text-ink sm:text-5xl lg:text-[4.5rem]">
                Browse approved event campaigns.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink/62 sm:text-lg">
                These events have passed platform review. Some are collecting nominations,
                some are scheduled, and live campaigns can accept votes immediately.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <DirectoryStat label="Approved" value={events.length} />
                <DirectoryStat label="Voting live" value={liveCount} />
                <DirectoryStat label="Nominations" value={nominationCount} />
              </div>
            </div>
          </div>

          <div className="relative min-h-[360px] bg-ink">
            {featured ? (
              <>
                <Image
                  src={featured.primaryFlyerUrl}
                  alt={featured.name}
                  fill
                  priority
                  className="object-cover opacity-90"
                  sizes="(max-width: 1024px) 100vw, 48vw"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.10),rgba(7,17,31,0.74))]" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(featured.status)}`}>
                    {formatStatus(featured.status)}
                  </span>
                  <h2 className="mt-4 max-w-md font-display text-3xl font-semibold leading-none text-white">
                    {featured.name}
                  </h2>
                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/72">
                    <span>{featured.categories.length} categories</span>
                    <span>/</span>
                    <span>Voting ends {formatDate(featured.votingEndAt)}</span>
                  </div>
                  <Link
                    href={`/events/${featured.id}`}
                    className="mt-6 inline-flex rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-primary hover:text-white"
                  >
                    Open event
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[360px] items-center justify-center text-sm text-white/50">
                Approved events will appear here after review
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[1.5rem] border border-line bg-white p-4 shadow-[0_18px_45px_rgba(7,17,31,0.045)] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
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
              placeholder="Search events, descriptions, categories"
              className="h-11 w-full rounded-xl border border-line bg-[#f8fafc] pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-primary focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <Link
            href="/my-events"
            className="rounded-xl border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink/62 transition hover:border-primary/35 hover:bg-primary/5 hover:text-primary"
          >
            My events
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-line/70 pt-4">
          {STATUS_OPTIONS.map((status) => {
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
            label="Loading approved events"
            detail="Fetching public campaigns and voting windows."
          />
        </div>
      ) : null}

      {!isLoading && filteredEvents.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-line bg-white p-10 text-center">
          <p className="font-display text-2xl font-semibold text-ink">No events match those filters</p>
          <p className="mt-2 text-sm text-ink/50">
            Try another status, search by category, or clear the search field.
          </p>
        </div>
      ) : null}

      {remaining.length > 0 ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {remaining.map((event) => (
            <PublicEventCard key={event.id} event={event} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DirectoryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-white/78 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/38">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function PublicEventCard({ event }: { event: EventResponse }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group overflow-hidden rounded-[1.5rem] border border-line bg-white shadow-[0_18px_45px_rgba(7,17,31,0.045)] transition hover:-translate-y-0.5 hover:border-primary/30"
    >
      <div className="relative aspect-[1.25] bg-[#eef2f7]">
        <Image
          src={event.primaryFlyerUrl}
          alt={event.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.02),rgba(7,17,31,0.44))]" />
        <div className="absolute left-4 top-4">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(event.status)}`}>
            {formatStatus(event.status)}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h2 className="line-clamp-2 font-display text-2xl font-semibold leading-none text-ink">
          {event.name}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/58">
          {event.description}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#f8fafc] p-3 text-xs">
          <div>
            <p className="font-semibold uppercase tracking-[0.12em] text-ink/35">Categories</p>
            <p className="mt-1 font-semibold text-ink">{event.categories.length}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-[0.12em] text-ink/35">Voting ends</p>
            <p className="mt-1 font-semibold text-ink">{formatDate(event.votingEndAt)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
