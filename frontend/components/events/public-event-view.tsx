"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api/client";
import { getEvent, listContestants } from "@/lib/api/events";
import {
  ContestantResponse,
  EventCategoryResponse,
  EventResponse,
} from "@/lib/api/types";
import { PublicLeaderboard } from "@/components/votes/public-leaderboard";
import { VoteModal } from "@/components/votes/vote-modal";
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function daysUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "now";
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

// ---------------------------------------------------------------------------
// Big contestant card (used during voting)
// ---------------------------------------------------------------------------

function BigContestantCard({
  contestant,
  category,
  votingLive,
  onVote,
}: {
  contestant: ContestantResponse;
  category: EventCategoryResponse | null;
  votingLive: boolean;
  onVote: () => void;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-primary/8 bg-white shadow-[0_10px_32px_-20px_rgba(7,17,31,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(7,17,31,0.24)]">
      {/* Photo */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#e4ecf8]">
        {contestant.imageUrl ? (
          <Image
            src={contestant.imageUrl}
            alt={contestant.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl font-bold text-primary/30">
            {getInitials(contestant.name)}
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 font-mono text-[0.7rem] font-semibold tracking-wider text-white backdrop-blur">
          {contestant.code}
        </span>
      </div>

      {/* Info + action */}
      <div className="flex flex-1 flex-col p-5">
        {category && (
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary/70">
            {category.name}
          </p>
        )}
        <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">
          {contestant.name}
        </h3>

        <button
          type="button"
          onClick={onVote}
          disabled={!votingLive}
          className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-white transition hover:bg-primary/88 disabled:cursor-not-allowed disabled:bg-ink/12 disabled:text-ink/40"
        >
          {votingLive ? (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Vote
            </>
          ) : (
            "Voting closed"
          )}
        </button>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Compact "Event details" — only shown below contestants during voting
// ---------------------------------------------------------------------------

function EventDetails({ event }: { event: EventResponse }) {
  return (
    <details className="group rounded-[1.5rem] border border-primary/10 bg-white/86 p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink/70 transition hover:text-primary">
        Event details
        <svg
          className="h-4 w-4 text-ink/40 transition group-open:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </summary>

      <div className="mt-5 space-y-5">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
            About
          </p>
          <p className="mt-2 text-sm leading-6 text-ink/72">
            {event.description}
          </p>
        </div>

        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
            Voting window
          </p>
          <p className="mt-2 text-sm text-ink/72">
            {formatDate(event.votingStartAt)} → {formatDate(event.votingEndAt)}
          </p>
        </div>

        {event.categories.length > 1 && (
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
              Categories
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {event.categories.map((cat) => (
                <li
                  key={cat.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f4ff] px-3 py-1 text-xs font-semibold text-primary/80"
                >
                  {cat.name}
                  <span className="text-[0.65rem] text-primary/50">
                    {formatCurrency(cat.votePriceMinor, cat.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function PublicEventView({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [contestants, setContestants] = useState<ContestantResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [votingContestant, setVotingContestant] =
    useState<ContestantResponse | null>(null);
  const [leaderboardVersion, setLeaderboardVersion] = useState<number>(0);
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [result, contestantList] = await Promise.all([
          getEvent(eventId),
          listContestants(eventId),
        ]);
        if (!cancelled) {
          setEvent(result);
          setContestants(contestantList);
        }
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
  const votingLive = event.status === "VOTING_LIVE";

  const showLeaderboard =
    event.contestantsCanViewLeaderboard &&
    (event.status === "VOTING_LIVE" ||
      event.status === "VOTING_CLOSED" ||
      event.status === "ARCHIVED");

  const votingCategory = votingContestant
    ? event.categories.find((c) => c.id === votingContestant.categoryId) ?? null
    : null;

  const contestantsByCategory = event.categories.map((cat) => ({
    category: cat,
    list: contestants.filter((c) => c.categoryId === cat.id),
  }));

  // ── Hero (shared across all states) ───────────────────────────────────────
  const Hero = (
    <div className="relative overflow-hidden rounded-[2rem] bg-ink shadow-[0_40px_90px_-50px_rgba(7,17,31,0.5)]">
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

      <div className="absolute inset-x-0 bottom-0 px-8 pb-8 sm:px-10 sm:pb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/52">
              {event.status.replaceAll("_", " ")}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl">
              {event.name}
            </h1>
            {votingLive && (
              <p className="mt-2 text-sm font-medium text-white/72">
                Voting closes {formatDate(event.votingEndAt)} ·{" "}
                <span className="text-white">{daysUntil(event.votingEndAt)}</span>
              </p>
            )}
          </div>

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
  );

  // ── Owner controls (shared) ───────────────────────────────────────────────
  const OwnerControls = isOwner && (
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
  );

  // ────────────────────────────────────────────────────────────────────────
  // VOTING-LIVE LAYOUT — contestants front and center
  // ────────────────────────────────────────────────────────────────────────
  if (votingLive) {
    return (
      <article className="mx-auto max-w-6xl pb-20">
        {Hero}
        {OwnerControls}

        {/* Contestants — full width, big cards, grouped by category */}
        <section className="mt-8 space-y-10">
          {contestantsByCategory.length === 0 || contestants.length === 0 ? (
            <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-10 text-center shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
              <p className="font-display text-xl font-semibold text-ink">
                No contestants yet
              </p>
              <p className="mt-2 text-sm text-ink/55">
                The event is live, but contestants haven&apos;t been added.
                Check back soon.
              </p>
            </div>
          ) : (
            contestantsByCategory.map(({ category, list }) => {
              if (list.length === 0) return null;
              return (
                <div key={category.id}>
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
                        Category
                      </p>
                      <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
                        {category.name}
                      </h2>
                    </div>
                    <span className="rounded-full border border-primary/16 bg-[#f0f4ff] px-3 py-1 text-xs font-semibold text-primary/80">
                      {formatCurrency(category.votePriceMinor, category.currency)} per vote
                    </span>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((contestant) => (
                      <BigContestantCard
                        key={contestant.id}
                        contestant={contestant}
                        category={category}
                        votingLive={votingLive}
                        onVote={() => setVotingContestant(contestant)}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Leaderboard */}
        {showLeaderboard && (
          <section className="mt-10">
            <PublicLeaderboard
              eventId={event.id}
              refreshKey={leaderboardVersion}
            />
          </section>
        )}

        {/* Collapsed event details */}
        <section className="mt-10">
          <EventDetails event={event} />
        </section>

        {/* Vote modal */}
        {votingContestant && votingCategory && (
          <VoteModal
            event={event}
            contestant={votingContestant}
            category={votingCategory}
            onClose={() => setVotingContestant(null)}
            onVoteSuccess={() => setLeaderboardVersion((v) => v + 1)}
          />
        )}
      </article>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // OTHER STATES — original info-led layout
  // ────────────────────────────────────────────────────────────────────────
  return (
    <article className="mx-auto max-w-6xl pb-20">
      {Hero}
      {OwnerControls}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          <StatusBanner event={event} />

          <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-7 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
              About this event
            </p>
            <p className="mt-4 text-base leading-7 text-ink/72">
              {event.description}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-7 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
              Key Dates
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Nominations open", value: formatDate(event.nominationStartAt) },
                { label: "Nominations close", value: formatDate(event.nominationEndAt) },
                { label: "Voting starts", value: formatDate(event.votingStartAt) },
                { label: "Voting ends", value: formatDate(event.votingEndAt) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-[#f7f9fc] px-4 py-3">
                  <dt className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-ink/36">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-7 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
              Categories
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
                      <p className="mt-0.5 text-sm text-ink/50">{cat.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full border border-primary/16 bg-[#f0f4ff] px-2.5 py-0.5 text-[0.68rem] font-semibold text-primary/80">
                    {formatCurrency(cat.votePriceMinor, cat.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {contestants.length > 0 && (
            <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-7 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
              <div className="flex items-baseline gap-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
                  Contestants
                </p>
                <span className="font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
                  {contestants.length}
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {contestants.map((contestant) => {
                  const catName =
                    event.categories.find((c) => c.id === contestant.categoryId)?.name ?? "";
                  return (
                    <div
                      key={contestant.id}
                      className="flex items-center gap-3 overflow-hidden rounded-xl border border-[#edf0f6] bg-[#f7f9fc] px-3 py-3"
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#e4ecf8]">
                        {contestant.imageUrl ? (
                          <Image src={contestant.imageUrl} alt={contestant.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-semibold text-primary/50">
                            {getInitials(contestant.name)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{contestant.name}</p>
                        {catName && (
                          <p className="truncate text-[0.68rem] text-ink/44">{catName}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-[#07111f] px-2.5 py-1 font-mono text-[0.65rem] font-semibold tracking-wider text-white">
                        {contestant.code}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showLeaderboard && (
            <PublicLeaderboard eventId={event.id} refreshKey={leaderboardVersion} />
          )}
        </div>

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
              {nominationsOpen ? <NominationForm event={event} /> : <StatusBanner event={event} />}
            </div>
          </div>
        </aside>
      </div>

      {votingContestant && votingCategory && (
        <VoteModal
          event={event}
          contestant={votingContestant}
          category={votingCategory}
          onClose={() => setVotingContestant(null)}
          onVoteSuccess={() => setLeaderboardVersion((v) => v + 1)}
        />
      )}
    </article>
  );
}
