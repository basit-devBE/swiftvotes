"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api/client";
import { getEvent } from "@/lib/api/events";
import { EventResponse } from "@/lib/api/types";
import { NominationForm, StatusBanner } from "./nomination-form";

function formatDate(date: string | null): string {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(minor: number, currency: string): string {
  if (minor === 0) return "Free";
  return `${currency} ${(minor / 100).toFixed(2)}`;
}

export function PublicEventView({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getEvent(eventId);
        if (!cancelled) setEvent(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : "Unable to load this event.",
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
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-base text-ink/50">Loading event…</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <p className="text-lg font-semibold text-ink/56">
          {error ?? "Event not found."}
        </p>
        <Link href="/events" className="button-secondary mt-6 inline-flex">
          Browse events
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === event.creatorUserId;
  const nominationsOpen = event.status === "NOMINATIONS_OPEN";

  return (
    <article className="mx-auto max-w-6xl pb-20">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2rem] bg-ink shadow-[0_40px_90px_-50px_rgba(7,17,31,0.5)]">
        {/* Banner / flyer */}
        {event.bannerUrl ? (
          <div className="relative aspect-[21/9] w-full">
            <Image
              src={event.bannerUrl}
              alt={event.name}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,17,31,0.82)_0%,rgba(7,17,31,0.22)_50%,transparent_100%)]" />
          </div>
        ) : (
          <div className="relative aspect-[21/9] w-full">
            <Image
              src={event.primaryFlyerUrl}
              alt={event.name}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,17,31,0.86)_0%,rgba(7,17,31,0.28)_52%,transparent_100%)]" />
          </div>
        )}

        {/* Text overlay */}
        <div className="absolute inset-x-0 bottom-0 px-8 pb-8 sm:px-10 sm:pb-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/52">
                {event.status.replaceAll("_", " ")}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl">
                {event.name}
              </h1>
            </div>

            {/* Flyer thumbnail (when banner is shown) */}
            {event.bannerUrl && (
              <div className="relative hidden h-20 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-white/20 shadow-xl sm:block">
                <Image
                  src={event.primaryFlyerUrl}
                  alt="Flyer"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Owner controls ───────────────────────────────────────────────── */}
      {isOwner && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/18 bg-[#eef4ff] px-5 py-3.5">
          <span className="text-xs font-semibold text-primary/70">
            You own this event
          </span>
          <div className="ml-auto flex gap-2">
            <Link
              href={`/events/${event.id}/manage`}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/88"
            >
              Manage
            </Link>
            <Link
              href={`/events/${event.id}/edit`}
              className="rounded-full border border-primary/24 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/8"
            >
              Edit
            </Link>
          </div>
        </div>
      )}

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left column – event info */}
        <div className="space-y-8">
          {/* Status banner */}
          <StatusBanner event={event} />

          {/* Description */}
          <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-7 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
              About this event
            </p>
            <p className="mt-4 text-base leading-7 text-ink/72">
              {event.description}
            </p>
          </div>

          {/* Key dates */}
          <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-7 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
              Key Dates
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Nominations open",
                  value: formatDate(event.nominationStartAt),
                },
                {
                  label: "Nominations close",
                  value: formatDate(event.nominationEndAt),
                },
                {
                  label: "Voting starts",
                  value: formatDate(event.votingStartAt),
                },
                {
                  label: "Voting ends",
                  value: formatDate(event.votingEndAt),
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl bg-[#f7f9fc] px-4 py-3"
                >
                  <dt className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-ink/36">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Categories */}
          <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-7 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
              Categories
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
              {event.categories.length}
            </p>
            <div className="mt-4 space-y-3">
              {event.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-start gap-4 rounded-xl border border-[#edf0f6] bg-[#f7f9fc] px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{cat.name}</p>
                    {cat.description && (
                      <p className="mt-0.5 text-sm text-ink/50">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full border border-primary/16 bg-[#f0f4ff] px-2.5 py-0.5 text-[0.68rem] font-semibold text-primary/80">
                    {formatCurrency(cat.votePriceMinor, cat.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column – nomination form */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-[1.5rem] border border-primary/10 bg-white/90 p-7 shadow-[0_16px_48px_-24px_rgba(7,17,31,0.18)]">
            <p className="font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
              {nominationsOpen ? "Submit a nomination" : "Nominations"}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-ink/54">
              {nominationsOpen
                ? `Nominate someone for ${event.name}. Your nomination will be reviewed before going live.`
                : "Nominations are not currently open for this event."}
            </p>

            <div className="mt-6">
              {nominationsOpen ? (
                <NominationForm event={event} />
              ) : (
                <StatusBanner event={event} />
              )}
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
