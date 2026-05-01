"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { ApiClientError } from "@/lib/api/client";
import { getLeaderboard } from "@/lib/api/votes";
import { LeaderboardCategory } from "@/lib/api/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type Props = {
  eventId: string;
  refreshKey?: number;
};

export function PublicLeaderboard({ eventId, refreshKey = 0 }: Props) {
  const [categories, setCategories] = useState<LeaderboardCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getLeaderboard(eventId);
        if (!cancelled) setCategories(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : "Unable to load leaderboard.",
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
  }, [eventId, refreshKey]);

  if (isLoading) {
    return (
      <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-7 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
          Leaderboard
        </p>
        <div className="mt-6 flex justify-center">
          <svg className="h-6 w-6 animate-spin text-primary/40" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-7 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
        <p className="text-sm text-ink/50">{error}</p>
      </div>
    );
  }

  const hasAnyContestants = categories.some((c) => c.contestants.length > 0);
  if (!hasAnyContestants) return null;

  return (
    <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-7 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
      <div className="flex items-baseline gap-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
          Leaderboard
        </p>
      </div>

      <div className="mt-5 space-y-6">
        {categories.map((cat) => {
          if (cat.contestants.length === 0) return null;
          return (
            <div key={cat.categoryId}>
              <p className="mb-3 font-display text-base font-semibold tracking-tight text-ink">
                {cat.categoryName}
              </p>
              <ol className="flex flex-col gap-2">
                {cat.contestants.map((entry) => (
                  <li
                    key={entry.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                      entry.rank === 1
                        ? "bg-[#fff8e8] ring-1 ring-[#f1c849]/40"
                        : "bg-[#f7f9fc]"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        entry.rank === 1
                          ? "bg-[#f1c849] text-white"
                          : entry.rank <= 3
                          ? "bg-ink/8 text-ink/60"
                          : "bg-transparent text-ink/30"
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#e4ecf8]">
                      {entry.imageUrl ? (
                        <Image
                          src={entry.imageUrl}
                          alt={entry.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[0.6rem] font-semibold text-primary/50">
                          {getInitials(entry.name)}
                        </div>
                      )}
                    </div>
                    <span className="flex-1 truncate text-sm font-medium text-ink">
                      {entry.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold text-ink/50 ring-1 ring-ink/8">
                      {entry.code}
                    </span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                      {entry.voteCount}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
