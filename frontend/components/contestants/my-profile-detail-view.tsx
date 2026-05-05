"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getMyContestantProfile } from "@/lib/api/contestants";
import { listContestants } from "@/lib/api/events";
import { ApiClientError } from "@/lib/api/client";
import { ContestantResponse, MyContestantProfileResponse } from "@/lib/api/types";

type EventStatus = MyContestantProfileResponse["event"]["status"];

function statusLabel(status: EventStatus): string {
  return status.replaceAll("_", " ");
}

function statusClass(status: EventStatus): string {
  if (status === "VOTING_LIVE") return "border-[#cfe7da] bg-[#eef9f2] text-[#1b6f4b]";
  if (status === "VOTING_SCHEDULED" || status === "NOMINATIONS_OPEN" || status === "NOMINATIONS_CLOSED")
    return "border-[#d8e1f5] bg-[#eef4ff] text-[#0f4cdb]";
  if (status === "VOTING_CLOSED" || status === "ARCHIVED")
    return "border-[#dce4f1] bg-white text-[#07111f]/50";
  return "border-[#dce4f1] bg-white text-[#07111f]/66";
}

function isVotingLive(status: EventStatus): boolean {
  return status === "VOTING_LIVE";
}

function isVotingPast(status: EventStatus): boolean {
  return status === "VOTING_CLOSED" || status === "ARCHIVED";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ContestantAvatar({ imageUrl, name, size }: { imageUrl: string | null; name: string; size: number }) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-[#dce8ff] font-bold text-primary"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function VotesSection({ profile }: { profile: MyContestantProfileResponse }) {
  const { event, voteCount } = profile;

  if (!event.contestantsCanViewOwnVotes || voteCount === null) return null;

  const label = isVotingPast(event.status)
    ? "Final vote count"
    : isVotingLive(event.status)
    ? "Your votes so far"
    : "Votes when voting opens";

  return (
    <div className="rounded-2xl border border-[#d8e1f5] bg-[#f5f8ff] p-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/40">{label}</p>
      <p className="font-display text-4xl font-bold tracking-tight text-primary">{voteCount}</p>
      {!isVotingLive(event.status) && !isVotingPast(event.status) && (
        <p className="mt-1 text-sm text-ink/50">
          Voting opens {formatDate(event.votingStartAt)}
        </p>
      )}
    </div>
  );
}

function LeaderboardSection({ profile }: { profile: MyContestantProfileResponse }) {
  const { event, category } = profile;
  const [contestants, setContestants] = useState<ContestantResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      if (!event.contestantsCanViewLeaderboard) {
        setLoading(false);
        return;
      }
      try {
        const data = await listContestants(event.id, category.id);
        if (!cancelled) setContestants(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLeaderboard();
    return () => { cancelled = true; };
  }, [event.id, event.contestantsCanViewLeaderboard, category.id]);

  if (!event.contestantsCanViewLeaderboard) return null;

  return (
    <div className="rounded-2xl border border-[#ececec] bg-white p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink/40">
        {category.name} — Leaderboard
      </p>
      {loading ? (
        <div className="flex justify-center py-6">
          <svg className="h-5 w-5 animate-spin text-primary/40" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
          </svg>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {contestants.map((c, i) => (
            <li
              key={c.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                c.id === profile.id
                  ? "bg-[#eef4ff] ring-1 ring-primary/20"
                  : "bg-[#f9f9f9]"
              }`}
            >
              <span className="w-6 text-center text-sm font-bold text-ink/30">
                {i + 1}
              </span>
              <ContestantAvatar imageUrl={c.imageUrl} name={c.name} size={32} />
              <span className="flex-1 truncate text-sm font-medium text-ink">
                {c.name}
                {c.id === profile.id && (
                  <span className="ml-2 text-xs font-semibold text-primary">(you)</span>
                )}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink/40 ring-1 ring-ink/8">
                {c.code}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function MyProfileDetailView({ contestantId }: { contestantId: string }) {
  const [profile, setProfile] = useState<MyContestantProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getMyContestantProfile(contestantId)
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError ? err.message : "Unable to load this profile.",
          );
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [contestantId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-primary/40" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
        </svg>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/my-profile" className="text-sm font-semibold text-primary hover:underline">
          ← Back to my profiles
        </Link>
        <div className="mt-8 flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-ink/50">{error ?? "Profile not found."}</p>
        </div>
      </div>
    );
  }

  const { event } = profile;
  const showsVotes = event.contestantsCanViewOwnVotes && profile.voteCount !== null;
  const showsLeaderboard = event.contestantsCanViewLeaderboard;
  const showsAnything = showsVotes || showsLeaderboard;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/my-profile" className="text-sm font-semibold text-primary hover:underline">
        ← Back to my profiles
      </Link>

      <article className="mt-6 overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_12px_40px_-20px_rgba(7,17,31,0.14)]">
        <div className="relative h-52 w-full overflow-hidden bg-[#c5d4f5] sm:h-60">
          {event.bannerUrl ? (
            <Image src={event.bannerUrl} alt={event.name} fill className="object-cover" />
          ) : event.primaryFlyerUrl ? (
            <Image src={event.primaryFlyerUrl} alt={event.name} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,76,219,0.28),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(15,76,219,0.18),transparent_50%)]" />
          )}
          <div className="absolute inset-0 bg-black/40" />

          <span className={`absolute right-4 top-4 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${statusClass(event.status)}`}>
            {statusLabel(event.status)}
          </span>

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div className="rounded-full ring-4 ring-white shadow-xl">
              <ContestantAvatar imageUrl={profile.imageUrl} name={profile.name} size={112} />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-16 text-center sm:px-8 sm:pt-16">
          <div className="mb-1 flex flex-wrap items-center justify-center gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
              {profile.name}
            </h2>
            <span className="rounded-full bg-[#f0f4ff] px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
              {profile.code}
            </span>
          </div>

          <p className="mb-1 text-sm text-ink/50">{profile.category.name}</p>

          <Link
            href={`/events/${event.id}`}
            className="text-sm font-semibold text-primary transition hover:underline"
          >
            {event.name}
          </Link>

          <p className="mt-1 text-xs text-ink/40">
            Voting: {formatDate(event.votingStartAt)} → {formatDate(event.votingEndAt)}
          </p>

          <div className="mt-6 flex flex-col gap-4 text-left">
            {showsVotes && <VotesSection profile={profile} />}
            {showsLeaderboard && <LeaderboardSection profile={profile} />}
            {!showsAnything && (
              <div className="rounded-2xl border border-[#ececec] bg-[#fafafa] p-5 text-center">
                <p className="text-sm text-ink/50">
                  The organiser hasn&apos;t enabled vote or leaderboard visibility for contestants in this event.
                </p>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
