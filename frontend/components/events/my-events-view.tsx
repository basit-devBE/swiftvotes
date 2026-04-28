"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ApiClientError } from "@/lib/api/client";
import { listMyEvents } from "@/lib/api/events";
import { EventResponse } from "@/lib/api/types";

function formatStatusLabel(status: EventResponse["status"]) {
  return status.replaceAll("_", " ");
}

function getStatusBadgeClass(status: EventResponse["status"]) {
  if (status === "APPROVED" || status === "VOTING_LIVE") {
    return "border-[#cfe7da] bg-[#eef9f2] text-[#1b6f4b]";
  }

  if (status === "REJECTED") {
    return "border-[#f0cfd3] bg-[#fff2f4] text-[#b40f17]";
  }

  if (status === "PENDING_APPROVAL") {
    return "border-[#d8e1f5] bg-[#eef4ff] text-[#0f4cdb]";
  }

  return "border-[#dce4f1] bg-white text-[#07111f]/66";
}

export function MyEventsView() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await listMyEvents();
        if (!cancelled) {
          setEvents(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load your events.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
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

    return { pending, live, drafts };
  }, [events]);

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,249,255,0.97)_58%,rgba(242,246,252,0.95)_100%)] p-6 shadow-[0_28px_70px_-50px_rgba(7,17,31,0.22)] sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(15,76,219,0.16),transparent_42%),radial-gradient(circle_at_top_right,rgba(180,15,23,0.08),transparent_24%)]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/72">
              Your events
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl lg:text-[4.6rem]">
              Manage what you have launched.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink/62 sm:text-lg">
              Review approvals, keep drafts moving, and jump back into any
              campaign without digging through a basic list.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/events" className="button-secondary">
              View approved events
            </Link>
            <Link href="/events/create" className="button-primary">
              Create event
            </Link>
          </div>
        </div>

        <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/80 bg-white/86 p-5 shadow-[0_18px_45px_-38px_rgba(7,17,31,0.28)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/44">
              Total events
            </p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-ink">
              {events.length}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/80 bg-white/86 p-5 shadow-[0_18px_45px_-38px_rgba(7,17,31,0.28)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/44">
              Pending approval
            </p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-ink">
              {stats.pending}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/80 bg-white/86 p-5 shadow-[0_18px_45px_-38px_rgba(7,17,31,0.28)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/44">
              Drafts and live
            </p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-ink">
              {stats.drafts + stats.live}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10 flex items-center justify-between gap-4 border-b border-primary/12 pb-5">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-ink/40">
            Workspace
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
            Recent campaigns
          </h2>
        </div>
        <span className="rounded-full border border-primary/12 bg-white px-4 py-2 text-sm font-semibold text-ink/58">
          {events.length} total
        </span>
      </div>

      {error ? (
        <div className="mt-8 rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-10 text-base text-ink/56">Loading your events...</p>
      ) : null}

      {!isLoading && events.length === 0 ? (
        <div className="mt-10 rounded-[1.8rem] border border-primary/12 bg-white/70 p-8">
          <p className="max-w-2xl text-base leading-7 text-ink/62">
            You have not created any events yet. Start with a flyer, define
            your categories, and set your nomination and voting dates.
          </p>
          <Link href="/events/create" className="button-primary mt-6">
            Create your first event
          </Link>
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group overflow-hidden rounded-[1.9rem] border border-primary/12 bg-white/82 shadow-[0_22px_55px_-42px_rgba(7,17,31,0.26)] transition hover:-translate-y-1 hover:border-primary/24"
          >
            <div className="grid min-h-[18rem] lg:grid-cols-[200px_minmax(0,1fr)]">
              <div className="relative min-h-[14rem] overflow-hidden bg-[#eff3f8]">
                <Image
                  src={event.primaryFlyerUrl}
                  alt={event.name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 100vw, 200px"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.04),rgba(7,17,31,0.34))]" />
              </div>
              <div className="flex flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] ${getStatusBadgeClass(event.status)}`}
                  >
                    {formatStatusLabel(event.status)}
                  </span>
                  <span className="text-sm font-semibold text-ink/48 transition group-hover:text-primary">
                    Open
                  </span>
                </div>
                <h2 className="mt-4 font-display text-[2rem] font-semibold leading-[0.95] tracking-[-0.04em] text-ink">
                  {event.name}
                </h2>
                <p className="mt-3 line-clamp-3 text-base leading-7 text-ink/62">
                  {event.description}
                </p>

                <div className="mt-auto pt-6">
                  <div className="grid gap-3 rounded-[1.4rem] bg-[#f7f9fd] p-4 text-sm text-ink/58 sm:grid-cols-2">
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/38">
                        Categories
                      </p>
                      <p className="mt-2 font-semibold text-ink">
                        {event.categories.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/38">
                        Voting starts
                      </p>
                      <p className="mt-2 font-semibold text-ink">
                        {new Date(event.votingStartAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
