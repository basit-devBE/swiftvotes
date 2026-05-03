"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getMyContestantProfiles } from "@/lib/api/contestants";
import { ApiClientError } from "@/lib/api/client";
import { MyContestantSummaryResponse } from "@/lib/api/types";

type EventStatus = MyContestantSummaryResponse["event"]["status"];

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

function ProfileCard({ profile }: { profile: MyContestantSummaryResponse }) {
  const { event } = profile;

  return (
    <Link
      href={`/my-profile/${profile.id}`}
      className="group block overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-22px_rgba(7,17,31,0.22)]"
    >
      <div className="relative h-32 w-full overflow-hidden bg-[#c5d4f5]">
        {event.bannerUrl ? (
          <Image src={event.bannerUrl} alt={event.name} fill className="object-cover" />
        ) : event.primaryFlyerUrl ? (
          <Image src={event.primaryFlyerUrl} alt={event.name} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,76,219,0.28),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(15,76,219,0.18),transparent_50%)]" />
        )}
        <div className="absolute inset-0 bg-black/35" />
        <span className={`absolute right-3 top-3 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold backdrop-blur-sm ${statusClass(event.status)}`}>
          {statusLabel(event.status)}
        </span>
        <div className="absolute bottom-0 left-5 translate-y-1/2">
          <div className="rounded-full ring-4 ring-white shadow-lg">
            <ContestantAvatar imageUrl={profile.imageUrl} name={profile.name} size={64} />
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-10">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">
            {profile.name}
          </h2>
          <span className="rounded-full bg-[#f0f4ff] px-2 py-0.5 font-mono text-[0.65rem] font-semibold text-primary">
            {profile.code}
          </span>
        </div>

        <p className="mt-0.5 text-xs text-ink/45">{profile.category.name}</p>

        <p className="mt-2 truncate text-sm font-semibold text-primary group-hover:underline">
          {event.name}
        </p>

        <p className="mt-1 text-[0.7rem] text-ink/40">
          {formatDate(event.votingStartAt)} → {formatDate(event.votingEndAt)}
        </p>
      </div>
    </Link>
  );
}

export function MyProfileView() {
  const [profiles, setProfiles] = useState<MyContestantSummaryResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getMyContestantProfiles()
      .then((data) => { if (!cancelled) setProfiles(data); })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError ? err.message : "Unable to load your profile.",
          );
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

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

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-ink/50">{error}</p>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f4ff]">
          <svg className="h-7 w-7 text-primary/40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-ink">No contestant profiles yet</p>
          <p className="mt-1 text-sm text-ink/50">
            You haven&apos;t been registered as a contestant in any event.
          </p>
        </div>
        <Link href="/events" className="button-secondary mt-2">
          Browse events
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          My Contestant Profile
        </h1>
        <p className="mt-2 text-ink/50">
          {profiles.length === 1
            ? "You're contesting in 1 event. Click the card to see your votes and ranking."
            : `You're contesting in ${profiles.length} events. Click a card to open it.`}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} />
        ))}
      </div>
    </div>
  );
}
