"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ApiClientError } from "@/lib/api/client";
import { listMyEvents } from "@/lib/api/events";
import { EventResponse } from "@/lib/api/types";

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

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <div className="flex flex-col gap-5 border-b border-primary/12 pb-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="section-kicker">Your events</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.045em] text-ink sm:text-5xl lg:text-[4.1rem]">
            Manage what you have launched.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink/62 sm:text-lg">
            Draft events, review approval status, and move each campaign toward
            nominations and voting.
          </p>
        </div>

        <Link href="/events/create" className="button-primary">
          Create event
        </Link>
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
        <div className="mt-10 max-w-2xl border-t border-primary/12 pt-8">
          <p className="text-base leading-7 text-ink/62">
            You have not created any events yet. Start with a flyer, define your
            categories, and set your nomination and voting dates.
          </p>
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group rounded-[1.6rem] border border-primary/12 bg-white/72 p-6 transition hover:-translate-y-0.5 hover:border-primary/24"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                  {event.status.replaceAll("_", " ")}
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  {event.name}
                </h2>
              </div>
              <span className="text-sm font-semibold text-ink/48 transition group-hover:text-primary">
                Open
              </span>
            </div>
            <p className="mt-4 text-base leading-7 text-ink/62">
              {event.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-ink/54">
              <span>{event.categories.length} categories</span>
              <span>•</span>
              <span>
                Voting starts {new Date(event.votingStartAt).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
