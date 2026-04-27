"use client";

import { useEffect, useState } from "react";

import { EventCard } from "@/components/event-card";

const featuredEvents = [
  {
    title: "Campus Choice",
    summary:
      "Vote across live student categories with fast checkouts, clean discovery, and public momentum.",
    category: "Awards",
    status: "Open now",
    visualTone: "indigo" as const,
    ctaLabel: "Vote now",
  },
  {
    title: "Radiance Finals",
    summary:
      "Review nominee momentum, launch final rounds, and bring a polished pageantry flow to the front page.",
    category: "Pageantry",
    status: "Nominations",
    visualTone: "blue" as const,
    ctaLabel: "See nominees",
  },
  {
    title: "Creator Impact",
    summary:
      "Feature audience-driven campaigns with shareable voting and a stronger public spotlight.",
    category: "Community",
    status: "Live vote",
    visualTone: "slate" as const,
    ctaLabel: "Explore vote",
  },
  {
    title: "Next Star",
    summary:
      "Push a talent showcase forward with urgent visibility, cleaner promotion, and clear result tracking.",
    category: "Talent",
    status: "Closing soon",
    visualTone: "amber" as const,
    ctaLabel: "Track results",
  },
  {
    title: "Future Voices",
    summary:
      "Run a flagship campaign with high visibility, nominee engagement, and structured live voting windows.",
    category: "Featured",
    status: "Coming next",
    visualTone: "crimson" as const,
    ctaLabel: "View event",
  },
];

export function EventsPreview() {
  const [activeIndex, setActiveIndex] = useState(1);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % featuredEvents.length);
    }, 6500);

    return () => window.clearInterval(interval);
  }, [activeIndex]);

  const goPrevious = () => {
    setActiveIndex((current) =>
      current === 0 ? featuredEvents.length - 1 : current - 1,
    );
  };

  const goNext = () => {
    setActiveIndex((current) => (current + 1) % featuredEvents.length);
  };

  const getRelativeOffset = (index: number) => {
    const length = featuredEvents.length;
    const forward = (index - activeIndex + length) % length;
    const backward = forward - length;

    return Math.abs(forward) <= Math.abs(backward) ? forward : backward;
  };

  const getDesktopTransform = (offset: number) => {
    if (offset === -1) {
      return "translateX(0%) translateY(1rem) scale(0.94)";
    }
    if (offset === 0) {
      return "translateX(106%) translateY(-0.35rem) scale(1)";
    }
    if (offset === 1) {
      return "translateX(212%) translateY(1rem) scale(0.94)";
    }
    if (offset < -1) {
      return "translateX(-12%) translateY(1.3rem) scale(0.9)";
    }

    return "translateX(224%) translateY(1.3rem) scale(0.9)";
  };

  return (
    <section id="events" className="section-space bg-white">
      <div className="page-shell">
        <div className="mx-auto max-w-4xl text-center">
          <p className="section-kicker">Featured events</p>
          <h2 className="mt-4 font-body text-5xl font-semibold tracking-[-0.05em] text-ink sm:text-6xl">
            What SwiftVote can power
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-ink/68 sm:text-xl">
            Seamless featured campaigns, pageantry rounds, and public voting
            experiences presented like the events themselves matter.
          </p>
        </div>

        <div className="mt-14 md:hidden">
          <EventCard
            title={featuredEvents[activeIndex].title}
            summary={featuredEvents[activeIndex].summary}
            category={featuredEvents[activeIndex].category}
            status={featuredEvents[activeIndex].status}
            visualTone={featuredEvents[activeIndex].visualTone}
            ctaLabel={featuredEvents[activeIndex].ctaLabel}
            indexLabel={`0${activeIndex + 1}`}
            isActive
          />
        </div>

        <div className="relative mt-14 hidden h-[36rem] md:block">
          {featuredEvents.map((event, index) => {
            const offset = getRelativeOffset(index);
            const isVisible = Math.abs(offset) <= 1;
            const isActive = offset === 0;

            return (
              <div
                key={event.title}
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
                  visualTone={event.visualTone}
                  ctaLabel={event.ctaLabel}
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
            {featuredEvents.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-3 rounded-full transition ${
                  index === activeIndex
                    ? "w-10 bg-black"
                    : "w-3 bg-black/18 hover:bg-black/28"
                }`}
                aria-label={`Go to featured event ${index + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </div>
    </section>
  );
}
