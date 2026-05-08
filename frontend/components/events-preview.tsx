"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { EventCard } from "@/components/event-card";
import { ApiClientError } from "@/lib/api/client";
import { listApprovedEvents } from "@/lib/api/events";
import { EventResponse, EventStatus } from "@/lib/api/types";

const tones = ["indigo", "blue", "slate", "amber", "crimson"] as const;

type FeaturedEvent = {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  imageSrc: string;
  visualTone: (typeof tones)[number];
  ctaLabel: string;
};

function formatStatus(status: EventStatus): string {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return "date not set";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function ctaForStatus(status: EventStatus): string {
  if (status === "VOTING_LIVE") return "Vote now";
  if (status === "NOMINATIONS_OPEN") return "Nominate";
  if (status === "VOTING_SCHEDULED") return "See schedule";
  return "View event";
}

function buildSummary(event: EventResponse): string {
  const categoryNames = event.categories.slice(0, 2).map((category) => category.name);
  const categoryText =
    categoryNames.length > 0
      ? categoryNames.join(", ")
      : `${event.categories.length} categories`;

  if (event.status === "VOTING_LIVE") {
    return `${categoryText} voting is open now. Voting closes ${formatDate(event.votingEndAt)}.`;
  }

  if (event.status === "NOMINATIONS_OPEN") {
    return `${categoryText} is accepting nominations before voting starts ${formatDate(event.votingStartAt)}.`;
  }

  if (event.status === "VOTING_SCHEDULED") {
    return `${categoryText} is set up and voting begins ${formatDate(event.votingStartAt)}.`;
  }

  if (event.status === "VOTING_CLOSED") {
    return `${categoryText} has completed voting. Results and campaign history remain available.`;
  }

  return `${categoryText} is approved and ready for public discovery on SwiftVote.`;
}

function mapFeaturedEvent(event: EventResponse, index: number): FeaturedEvent {
  return {
    id: event.id,
    title: event.name,
    summary: buildSummary(event),
    category: event.categories[0]?.name ?? "Event",
    status: formatStatus(event.status),
    imageSrc: event.primaryFlyerUrl,
    visualTone: tones[index % tones.length],
    ctaLabel: ctaForStatus(event.status),
  };
}

export function EventsPreview() {
  const [events, setEvents] = useState<FeaturedEvent[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const result = await listApprovedEvents();
        if (!cancelled) {
          setEvents(result.slice(0, 5).map(mapFeaturedEvent));
          setActiveIndex(0);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load featured events.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (events.length <= 1) return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % events.length);
    }, 6500);

    return () => window.clearInterval(interval);
  }, [events.length]);

  const statusLine = useMemo(() => {
    const live = events.filter((event) => event.status === "Voting Live").length;
    const open = events.filter((event) => event.status === "Nominations Open").length;
    if (live > 0) return `${live} campaign${live === 1 ? "" : "s"} accepting votes now`;
    if (open > 0) return `${open} campaign${open === 1 ? "" : "s"} collecting nominations`;
    return "Approved campaigns from the live SwiftVote directory";
  }, [events]);

  const goPrevious = () => {
    setActiveIndex((current) => (current === 0 ? events.length - 1 : current - 1));
  };

  const goNext = () => {
    setActiveIndex((current) => (current + 1) % events.length);
  };

  const getRelativeOffset = (index: number) => {
    const length = events.length;
    const forward = (index - activeIndex + length) % length;
    const backward = forward - length;

    return Math.abs(forward) <= Math.abs(backward) ? forward : backward;
  };

  const getDesktopTransform = (offset: number) => {
    if (offset === -1) return "translateX(0%) translateY(1rem) scale(0.94)";
    if (offset === 0) return "translateX(106%) translateY(-0.35rem) scale(1)";
    if (offset === 1) return "translateX(212%) translateY(1rem) scale(0.94)";
    if (offset < -1) return "translateX(-12%) translateY(1.3rem) scale(0.9)";
    return "translateX(224%) translateY(1.3rem) scale(0.9)";
  };

  return (
    <section id="events" className="section-space bg-white">
      <div className="page-shell">
        <div className="mx-auto max-w-4xl text-center">
          <p className="section-kicker">Live event directory</p>
          <h2 className="mt-4 font-display text-5xl font-semibold leading-[0.95] text-ink sm:text-6xl">
            Campaigns currently moving through SwiftVote.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-ink/64 sm:text-xl">
            {statusLine}. Open a campaign to review its categories, voting window, contestants, and public participation flow.
          </p>
        </div>

        {error ? (
          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-accent/20 bg-accent/5 px-5 py-4 text-sm font-medium text-accent">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-[34rem] animate-pulse rounded-[2.4rem] bg-[#eef2f7]"
              />
            ))}
          </div>
        ) : null}

        {!isLoading && events.length === 0 ? (
          <div className="mx-auto mt-14 max-w-2xl rounded-[2rem] border border-dashed border-line bg-[#f8fafc] p-8 text-center">
            <p className="font-display text-2xl font-semibold text-ink">
              No approved campaigns are public yet.
            </p>
            <p className="mt-3 text-sm leading-6 text-ink/52">
              Once an event is approved, this section will pull it from the backend and feature its real flyer, schedule, and category setup.
            </p>
            <Link
              href="/events/create"
              className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-deep"
            >
              Create an event
            </Link>
          </div>
        ) : null}

        {!isLoading && events.length > 0 ? (
          <>
            <div className="mt-14 md:hidden">
              <EventCard
                title={events[activeIndex].title}
                summary={events[activeIndex].summary}
                category={events[activeIndex].category}
                status={events[activeIndex].status}
                imageSrc={events[activeIndex].imageSrc}
                visualTone={events[activeIndex].visualTone}
                ctaLabel={events[activeIndex].ctaLabel}
                href={`/events/${events[activeIndex].id}`}
                indexLabel={`0${activeIndex + 1}`}
                isActive
              />
            </div>

            <div className="relative mt-14 hidden h-[36rem] md:block">
              {events.map((event, index) => {
                const offset = getRelativeOffset(index);
                const isVisible = Math.abs(offset) <= 1;
                const isActive = offset === 0;

                return (
                  <div
                    key={event.id}
                    className="absolute left-0 top-0 w-[31.5%] transition-[transform,opacity,filter] duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      transform: getDesktopTransform(offset),
                      opacity: isVisible ? 1 : 0,
                      filter: isActive ? "blur(0px)" : "saturate(0.92)",
                      zIndex: isActive ? 30 : 20 - Math.abs(offset),
                      pointerEvents: isVisible ? "auto" : "none",
                    }}
                  >
                    <EventCard
                      title={event.title}
                      summary={event.summary}
                      category={event.category}
                      status={event.status}
                      imageSrc={event.imageSrc}
                      visualTone={event.visualTone}
                      ctaLabel={event.ctaLabel}
                      href={`/events/${event.id}`}
                      indexLabel={isActive ? `0${activeIndex + 1}` : undefined}
                      isActive={isActive}
                      onSelect={() => setActiveIndex(index)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div className="flex items-center gap-2">
                {events.map((event, index) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-3 rounded-full transition ${
                      index === activeIndex
                        ? "w-10 bg-primary"
                        : "w-3 bg-black/18 hover:bg-black/28"
                    }`}
                    aria-label={`Go to featured event ${index + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/events"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-ink/12 bg-white px-6 text-sm font-semibold text-ink transition hover:border-primary/24 hover:text-primary"
                >
                  Browse all events
                </Link>
                {events.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={goPrevious}
                      className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-ink/12 bg-white text-xl text-ink transition hover:border-ink/24 hover:bg-ink/5"
                      aria-label="Previous featured event"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-ink/12 bg-white text-xl text-ink transition hover:border-ink/24 hover:bg-ink/5"
                      aria-label="Next featured event"
                    >
                      →
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
