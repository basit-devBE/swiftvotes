"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ApiClientError } from "@/lib/api/client";
import {
  confirmNomination,
  getContestantCredentials,
  getEvent,
  listContestants,
  listNominations,
  regenerateMagicLink,
  rejectNomination,
  updateEventVisibility,
} from "@/lib/api/events";
import {
  ContestantCredentialsResponse,
  ContestantResponse,
  EventCategoryResponse,
  EventResponse,
  NominationResponse,
  NominationStatus,
} from "@/lib/api/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "overview" | "nominations" | "contestants" | "votes";
type NomFilter = "all" | NominationStatus;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEventStatus(status: EventResponse["status"]): string {
  const map: Record<EventResponse["status"], string> = {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending Approval",
    REJECTED: "Rejected",
    APPROVED: "Approved",
    NOMINATIONS_OPEN: "Nominations Open",
    NOMINATIONS_CLOSED: "Nominations Closed",
    VOTING_SCHEDULED: "Voting Scheduled",
    VOTING_LIVE: "Voting Live",
    VOTING_CLOSED: "Voting Closed",
    ARCHIVED: "Archived",
  };
  return map[status] ?? status;
}

function getEventStatusBadgeClass(status: EventResponse["status"]): string {
  if (
    status === "APPROVED" ||
    status === "NOMINATIONS_OPEN" ||
    status === "VOTING_LIVE"
  ) {
    return "border-[#cfe7da] bg-[#eef9f2] text-[#1b6f4b]";
  }
  if (status === "REJECTED") {
    return "border-[#f0cfd3] bg-[#fff2f4] text-[#b40f17]";
  }
  if (status === "PENDING_APPROVAL") {
    return "border-[#d8e1f5] bg-[#eef4ff] text-[#0f4cdb]";
  }
  if (status === "VOTING_CLOSED" || status === "ARCHIVED") {
    return "border-[#dce4f1] bg-[#f4f6fb] text-[#07111f]/54";
  }
  return "border-[#dce4f1] bg-white text-[#07111f]/66";
}

function getNomStatusBadgeClass(status: NominationStatus): string {
  if (status === "CONFIRMED") return "border-[#cfe7da] bg-[#eef9f2] text-[#1b6f4b]";
  if (status === "REJECTED") return "border-[#f0cfd3] bg-[#fff2f4] text-[#b40f17]";
  return "border-[#d8e1f5] bg-[#eef4ff] text-[#0f4cdb]";
}

function formatNomStatus(status: NominationStatus): string {
  if (status === "PENDING_REVIEW") return "Pending Review";
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "REJECTED") return "Rejected";
  return status;
}

function formatDate(date: string | null): string {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(minor: number, currency: string): string {
  if (minor === 0) return "Free";
  return `${currency} ${(minor / 100).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Lifecycle steps
// ---------------------------------------------------------------------------

const LIFECYCLE_STEPS: EventResponse["status"][] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "NOMINATIONS_OPEN",
  "NOMINATIONS_CLOSED",
  "VOTING_SCHEDULED",
  "VOTING_LIVE",
  "VOTING_CLOSED",
  "ARCHIVED",
];

type StepState = "done" | "current" | "upcoming";

function getStepState(
  step: EventResponse["status"],
  eventStatus: EventResponse["status"],
): StepState {
  // For REJECTED events, treat DRAFT and PENDING_APPROVAL as done
  if (eventStatus === "REJECTED") {
    if (step === "DRAFT" || step === "PENDING_APPROVAL") return "done";
    return "upcoming";
  }
  const currentIdx = LIFECYCLE_STEPS.indexOf(eventStatus);
  const stepIdx = LIFECYCLE_STEPS.indexOf(step);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "current";
  return "upcoming";
}

// ---------------------------------------------------------------------------
// NominationCard
// ---------------------------------------------------------------------------

function NominationCard({
  nomination,
  categoryName,
  contestant,
  onConfirm,
  onReject,
  isConfirming,
  isRejecting,
}: {
  nomination: NominationResponse;
  categoryName: string;
  contestant?: ContestantResponse;
  onConfirm: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  isConfirming: boolean;
  isRejecting: boolean;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");

  const initials = nomination.nomineeName
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleConfirmReject() {
    onReject(nomination.id, reason.trim());
    setRejectMode(false);
    setReason("");
  }

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-primary/10 bg-white/90 shadow-[0_8px_24px_-12px_rgba(7,17,31,0.12)] transition hover:shadow-[0_12px_32px_-14px_rgba(7,17,31,0.18)]">
      <div className="flex gap-4 p-5">
        {/* Avatar */}
        <div className="shrink-0">
          {nomination.nomineeImageUrl ? (
            <div className="relative h-14 w-14 overflow-hidden rounded-full bg-[#eff3f8]">
              <Image
                src={nomination.nomineeImageUrl}
                alt={nomination.nomineeName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d8e6ff,#eef4ff)] text-base font-semibold text-primary">
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold leading-tight tracking-[-0.03em] text-ink">
                {nomination.nomineeName}
              </p>
              {nomination.nomineeEmail && (
                <p className="mt-0.5 truncate text-xs text-ink/48">
                  {nomination.nomineeEmail}
                </p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${getNomStatusBadgeClass(nomination.status)}`}
            >
              {formatNomStatus(nomination.status)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-primary/16 bg-[#f0f4ff] px-2.5 py-0.5 text-[0.7rem] font-semibold text-primary/80">
              {categoryName}
            </span>
            {nomination.nomineePhone && (
              <span className="rounded-full border border-[#dce4f1] bg-[#f7f9fc] px-2.5 py-0.5 text-[0.7rem] text-ink/52">
                {nomination.nomineePhone}
              </span>
            )}
            {contestant && (
              <span className="rounded-full border border-[#1b6f4b]/20 bg-[#07111f] px-2.5 py-0.5 font-mono text-[0.7rem] font-semibold tracking-wider text-white">
                {contestant.code}
              </span>
            )}
          </div>

          <p className="mt-2.5 text-xs text-ink/44">
            Submitted by{" "}
            <span className="font-medium text-ink/60">
              {nomination.submitterName}
            </span>{" "}
            · {formatDate(nomination.createdAt)}
          </p>
          {(nomination.submitterPhone || nomination.submitterEmail) && (
            <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-ink/48">
              {nomination.submitterPhone && (
                <span>{nomination.submitterPhone}</span>
              )}
              {nomination.submitterPhone && nomination.submitterEmail && (
                <span className="text-ink/30">·</span>
              )}
              {nomination.submitterEmail && (
                <span className="truncate">{nomination.submitterEmail}</span>
              )}
            </p>
          )}

          {nomination.status === "REJECTED" && nomination.rejectionReason && (
            <p className="mt-2 text-xs italic text-accent/70">
              Reason: {nomination.rejectionReason}
            </p>
          )}
        </div>
      </div>

      {/* Action bar — pending only */}
      {nomination.status === "PENDING_REVIEW" && !rejectMode && (
        <div className="border-t border-primary/8 bg-[#f9fafb]">
          {/* No-email warning */}
          {!nomination.nomineeEmail && (
            <div className="flex items-start gap-2 border-b border-[#fde68a]/60 bg-[#fffbeb] px-5 py-3">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b45309]" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5Zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
              </svg>
              <p className="text-[11px] leading-4 text-[#92400e]">
                <span className="font-semibold">No email on record.</span> Add an email to this nomination before confirming — login credentials will be sent to it.
              </p>
            </div>
          )}
          {/* Email present — soft reminder */}
          {nomination.nomineeEmail && (
            <div className="flex items-start gap-2 border-b border-[#fde68a]/60 bg-[#fffbeb] px-5 py-3">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b45309]" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5Zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
              </svg>
              <p className="text-[11px] leading-4 text-[#92400e]">
                Make sure <span className="font-semibold">{nomination.nomineeEmail}</span> is correct — login credentials will be sent there.
              </p>
            </div>
          )}
          <div className="flex gap-2 px-5 py-3">
            <button
              onClick={() => onConfirm(nomination.id)}
              disabled={isConfirming || !nomination.nomineeEmail}
              title={!nomination.nomineeEmail ? "Add an email before confirming" : undefined}
              className="rounded-full border border-[#cfe7da] bg-[#eef9f2] px-4 py-1.5 text-xs font-semibold text-[#1b6f4b] transition hover:bg-[#dcf5e8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isConfirming ? "Confirming…" : "Confirm"}
            </button>
            <button
              onClick={() => setRejectMode(true)}
              className="rounded-full border border-[#f0cfd3] bg-[#fff2f4] px-4 py-1.5 text-xs font-semibold text-accent transition hover:bg-[#fde8eb]"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Inline reject form */}
      {nomination.status === "PENDING_REVIEW" && rejectMode && (
        <div className="border-t border-primary/8 bg-[#f9fafb] p-5">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/44">
            Reason for rejection
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Optional — e.g. duplicate nomination, incomplete details…"
            className="mt-2 w-full resize-none rounded-xl border border-primary/16 bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/32 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleConfirmReject}
              disabled={isRejecting}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-accent/88 disabled:opacity-50"
            >
              {isRejecting ? "Rejecting…" : "Confirm Rejection"}
            </button>
            <button
              onClick={() => {
                setRejectMode(false);
                setReason("");
              }}
              className="rounded-full border border-primary/16 px-4 py-1.5 text-xs font-semibold text-ink/56 transition hover:bg-primary/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function VisibilityToggle({
  label,
  description,
  checked,
  loading,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-ink/48">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        disabled={loading}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 ${checked ? "bg-primary" : "bg-[#dce4f1]"}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

function OverviewTab({
  event,
  onToggleOwnVotes,
  onToggleLeaderboard,
  togglingOwnVotes,
  togglingLeaderboard,
}: {
  event: EventResponse;
  onToggleOwnVotes: () => void;
  onToggleLeaderboard: () => void;
  togglingOwnVotes: boolean;
  togglingLeaderboard: boolean;
}) {
  // Build the step list — insert REJECTED after PENDING_APPROVAL if relevant
  const displaySteps =
    event.status === "REJECTED"
      ? (["DRAFT", "PENDING_APPROVAL", "REJECTED"] as EventResponse["status"][])
      : LIFECYCLE_STEPS;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Left: lifecycle + dates */}
      <div className="space-y-6">
        {/* Lifecycle */}
        <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-6 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
            Event Lifecycle
          </p>
          <div className="mt-5">
            {displaySteps.map((step, i) => {
              const isLast = i === displaySteps.length - 1;
              const isRejectedStep = step === "REJECTED";
              const state = isRejectedStep
                ? event.status === "REJECTED"
                  ? "current"
                  : "upcoming"
                : getStepState(step, event.status);

              return (
                <div key={step} className="flex gap-3">
                  {/* Connector column */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        state === "done"
                          ? "border-[#1b6f4b] bg-[#eef9f2] text-[#1b6f4b]"
                          : state === "current" && isRejectedStep
                            ? "border-accent bg-accent text-white shadow-[0_0_0_4px_rgba(180,15,23,0.12)]"
                            : state === "current"
                              ? "border-primary bg-primary text-white shadow-[0_0_0_4px_rgba(15,76,219,0.12)]"
                              : "border-[#dce4f1] bg-white text-ink/28"
                      }`}
                    >
                      {state === "done" ? (
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                        </svg>
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`my-0.5 w-0.5 flex-1 rounded-full ${state === "done" ? "bg-[#cfe7da]" : "bg-[#e8edf4]"}`}
                        style={{ minHeight: 20 }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
                    <p
                      className={`text-sm font-semibold ${
                        state === "current"
                          ? "text-ink"
                          : state === "done"
                            ? "text-ink/58"
                            : "text-ink/28"
                      }`}
                    >
                      {formatEventStatus(step)}
                    </p>
                    {state === "current" &&
                      isRejectedStep &&
                      event.rejectionReason && (
                        <p className="mt-0.5 text-xs italic text-accent/70">
                          {event.rejectionReason}
                        </p>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key dates */}
        <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-6 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
            Key Dates
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                label: "Nominations Open",
                value: formatDate(event.nominationStartAt),
              },
              {
                label: "Nominations Close",
                value: formatDate(event.nominationEndAt),
              },
              {
                label: "Voting Starts",
                value: formatDate(event.votingStartAt),
              },
              { label: "Voting Ends", value: formatDate(event.votingEndAt) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-[#edf0f6] bg-[#f7f9fc] p-4"
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/38">
                  {label}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contestant visibility */}
        <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-6 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
            Contestant Visibility
          </p>
          <div className="mt-5 space-y-5">
            <VisibilityToggle
              label="Contestants can see their own votes"
              description="Each contestant can view only their personal vote count."
              checked={event.contestantsCanViewOwnVotes}
              loading={togglingOwnVotes}
              onToggle={onToggleOwnVotes}
            />
            <div className="border-t border-primary/8" />
            <VisibilityToggle
              label="Contestants can see the leaderboard"
              description="All contestants can view total votes for every other contestant."
              checked={event.contestantsCanViewLeaderboard}
              loading={togglingLeaderboard}
              onToggle={onToggleLeaderboard}
            />
          </div>
        </div>
      </div>

      {/* Right: categories */}
      <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-6 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
          Categories
        </p>
        <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
          {event.categories.length}
        </p>
        <div className="mt-5 space-y-3">
          {event.categories.length === 0 ? (
            <p className="text-sm text-ink/46">No categories added yet.</p>
          ) : (
            event.categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#edf0f6] bg-[#f7f9fc] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{cat.name}</p>
                  {cat.description && (
                    <p className="mt-0.5 truncate text-xs text-ink/44">
                      {cat.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full border border-primary/16 bg-[#f0f4ff] px-2.5 py-0.5 text-[0.68rem] font-semibold text-primary/80">
                  {formatCurrency(cat.votePriceMinor, cat.currency)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nominations tab
// ---------------------------------------------------------------------------

function NominationsTab({
  eventId,
  categories,
  eventStatus,
}: {
  eventId: string;
  categories: EventCategoryResponse[];
  eventStatus: EventResponse["status"];
}) {
  const [nominations, setNominations] = useState<NominationResponse[]>([]);
  const [contestantsByNomination, setContestantsByNomination] = useState<Record<string, ContestantResponse>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NomFilter>("all");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  async function refreshContestants() {
    const list = await listContestants(eventId);
    setContestantsByNomination(
      Object.fromEntries(list.map((c) => [c.nominationId, c])),
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [noms, contestants] = await Promise.all([
          listNominations(eventId),
          listContestants(eventId),
        ]);
        if (!cancelled) {
          setNominations(noms);
          setContestantsByNomination(
            Object.fromEntries(contestants.map((c) => [c.nominationId, c])),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : "Unable to load nominations.",
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

  async function handleConfirm(nominationId: string) {
    setConfirmingId(nominationId);
    try {
      const updated = await confirmNomination(eventId, nominationId);
      setNominations((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n)),
      );
      await refreshContestants();
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleReject(nominationId: string, reason: string) {
    setRejectingId(nominationId);
    try {
      const updated = await rejectNomination(eventId, nominationId, { reason });
      setNominations((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n)),
      );
    } finally {
      setRejectingId(null);
    }
  }

  const counts = useMemo(
    () => ({
      all: nominations.length,
      PENDING_REVIEW: nominations.filter((n) => n.status === "PENDING_REVIEW")
        .length,
      CONFIRMED: nominations.filter((n) => n.status === "CONFIRMED").length,
      REJECTED: nominations.filter((n) => n.status === "REJECTED").length,
    }),
    [nominations],
  );

  const filtered = useMemo(
    () =>
      filter === "all"
        ? nominations
        : nominations.filter((n) => n.status === filter),
    [nominations, filter],
  );

  const notOpenYet =
    eventStatus === "DRAFT" ||
    eventStatus === "PENDING_APPROVAL" ||
    eventStatus === "REJECTED" ||
    eventStatus === "APPROVED";

  if (isLoading) {
    return <p className="text-base text-ink/56">Loading nominations…</p>;
  }

  if (error) {
    return (
      <div className="rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Info banner when nominations haven't opened */}
      {notOpenYet && nominations.length === 0 && (
        <div className="mb-6 rounded-[1.25rem] border border-primary/14 bg-[#eef4ff] px-5 py-4 text-sm text-primary">
          <span className="font-semibold">Nominations are not open yet.</span>{" "}
          They will open automatically once your event is approved and the
          nomination start date is reached.
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "all" as NomFilter, label: "All", count: counts.all },
            {
              key: "PENDING_REVIEW" as NomFilter,
              label: "Pending Review",
              count: counts.PENDING_REVIEW,
            },
            {
              key: "CONFIRMED" as NomFilter,
              label: "Confirmed",
              count: counts.CONFIRMED,
            },
            {
              key: "REJECTED" as NomFilter,
              label: "Rejected",
              count: counts.REJECTED,
            },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === key
                ? "bg-primary text-white shadow-[0_2px_12px_-4px_rgba(15,76,219,0.4)]"
                : "border border-primary/16 bg-white text-ink/56 hover:border-primary/32 hover:text-ink"
            }`}
          >
            {label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold ${
                filter === key ? "bg-white/20" : "bg-primary/8 text-primary"
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mt-8 rounded-[1.5rem] border border-primary/10 bg-white/60 p-12 text-center">
          <p className="text-base font-semibold text-ink/46">
            {filter === "all"
              ? "No nominations yet."
              : `No ${formatNomStatus(filter as NominationStatus).toLowerCase()} nominations.`}
          </p>
          {filter === "all" && !notOpenYet && (
            <p className="mt-2 text-sm text-ink/34">
              Share your event page so people can submit nominations.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((nomination) => (
            <NominationCard
              key={nomination.id}
              nomination={nomination}
              categoryName={
                categoryMap[nomination.categoryId] ?? "Unknown category"
              }
              contestant={contestantsByNomination[nomination.id]}
              onConfirm={handleConfirm}
              onReject={handleReject}
              isConfirming={confirmingId === nomination.id}
              isRejecting={rejectingId === nomination.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Contestant drawer
// ---------------------------------------------------------------------------

function ContestantDrawer({
  contestant,
  eventId,
  categoryName,
  onClose,
}: {
  contestant: ContestantResponse;
  eventId: string;
  categoryName: string;
  onClose: () => void;
}) {
  const [creds, setCreds] = useState<ContestantCredentialsResponse | null>(null);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const initials = contestant.name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    let cancelled = false;
    setLoadingCreds(true);
    getContestantCredentials(eventId, contestant.id)
      .then((c) => { if (!cancelled) setCreds(c); })
      .catch(() => { if (!cancelled) setCreds(null); })
      .finally(() => { if (!cancelled) setLoadingCreds(false); });
    return () => { cancelled = true; };
  }, [eventId, contestant.id]);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const result = await regenerateMagicLink(eventId, contestant.id);
      setCreds((prev) => prev ? { ...prev, magicLinkUrl: result.magicLinkUrl } : prev);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[#07111f]/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-[0_0_60px_-20px_rgba(7,17,31,0.36)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-primary/10 px-6 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
            Contestant Details
          </p>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink/40 transition hover:bg-primary/8 hover:text-ink"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Photo + identity */}
          <div className="flex items-center gap-4 px-6 py-5">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#eff3f8]">
              {contestant.imageUrl ? (
                <Image src={contestant.imageUrl} alt={contestant.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="font-display text-xl font-semibold text-primary/40">{initials}</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold leading-tight tracking-[-0.03em] text-ink">
                {contestant.name}
              </p>
              {contestant.email && (
                <p className="mt-0.5 truncate text-sm text-ink/48">{contestant.email}</p>
              )}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded-lg bg-[#07111f] px-2 py-0.5 font-mono text-[0.68rem] font-bold tracking-widest text-white">
                  {contestant.code}
                </span>
                <span className="rounded-full border border-primary/16 bg-[#f0f4ff] px-2.5 py-0.5 text-[0.68rem] font-semibold text-primary/80">
                  {categoryName}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-primary/8 px-6 py-5 space-y-5">
            {loadingCreds ? (
              <p className="text-sm text-ink/44">Loading login info…</p>
            ) : !creds?.hasAccount ? (
              <div className="rounded-xl border border-[#dce4f1] bg-[#f7f9fc] p-4 text-center">
                <p className="text-sm font-semibold text-ink/60">No account</p>
                <p className="mt-1 text-xs text-ink/38">
                  {contestant.email
                    ? "An account will be created next time credentials are provisioned."
                    : "This contestant has no email address on record."}
                </p>
              </div>
            ) : (
              <>
                {/* Password */}
                <div>
                  <p className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
                    Password
                  </p>
                  <div className="flex items-center gap-3 rounded-xl border border-primary/12 bg-[#f7f9fc] px-4 py-3">
                    <span className="font-mono text-sm tracking-[0.3em] text-ink/40">••••••••••</span>
                    <span className="ml-auto text-[11px] text-ink/36">Sent to contestant&apos;s email</span>
                  </div>
                </div>

                {/* Magic link */}
                <div>
                  <p className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
                    Login Link
                  </p>
                  {creds.magicLinkUrl ? (
                    <div className="rounded-xl border border-primary/12 bg-[#f7f9fc] p-3">
                      <p className="break-all font-mono text-[0.68rem] leading-5 text-ink/54">
                        {creds.magicLinkUrl}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleCopy(creds.magicLinkUrl!)}
                          className="flex items-center gap-1.5 rounded-full border border-primary/18 bg-white px-3 py-1.5 text-[0.7rem] font-semibold text-ink/70 transition hover:border-primary/36 hover:text-ink"
                        >
                          {copied ? (
                            <>
                              <svg className="h-3 w-3 text-[#1b6f4b]" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" /><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
                              </svg>
                              Copy link
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleRegenerate}
                          disabled={regenerating}
                          className="flex items-center gap-1.5 rounded-full border border-primary/18 bg-white px-3 py-1.5 text-[0.7rem] font-semibold text-ink/70 transition hover:border-primary/36 hover:text-ink disabled:opacity-50"
                        >
                          <svg className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5ZM1.705 8.005a.75.75 0 0 1 .834.656 5.501 5.501 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834Z" />
                          </svg>
                          {regenerating ? "Regenerating…" : "Regenerate"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#dce4f1] bg-[#f7f9fc] p-4">
                      <p className="text-xs text-ink/44">No active link. Click Regenerate to create one.</p>
                      <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="mt-3 flex items-center gap-1.5 rounded-full border border-primary/18 bg-white px-3 py-1.5 text-[0.7rem] font-semibold text-ink/70 transition hover:border-primary/36 hover:text-ink disabled:opacity-50"
                      >
                        {regenerating ? "Generating…" : "Generate login link"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Contestants tab
// ---------------------------------------------------------------------------

function ContestantsTab({
  eventId,
  categories,
}: {
  eventId: string;
  categories: EventCategoryResponse[];
}) {
  const [contestants, setContestants] = useState<ContestantResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContestant, setSelectedContestant] = useState<ContestantResponse | null>(null);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  useEffect(() => {
    let cancelled = false;
    listContestants(eventId)
      .then((list) => { if (!cancelled) setContestants(list); })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiClientError ? err.message : "Unable to load contestants.");
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [eventId]);

  if (isLoading) return <p className="text-base text-ink/56">Loading contestants…</p>;

  if (error) {
    return (
      <div className="rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
        {error}
      </div>
    );
  }

  if (contestants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.8rem] border border-primary/10 bg-white/60 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff]">
          <svg className="h-7 w-7 text-primary/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold tracking-[-0.03em] text-ink">
          No contestants yet
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-ink/50">
          Contestants appear here once nominations are confirmed. Go to the Nominations tab to review and confirm pending nominations.
        </p>
      </div>
    );
  }

  const byCategory = categories
    .map((cat) => ({
      category: cat,
      contestants: contestants.filter((c) => c.categoryId === cat.id),
    }))
    .filter((group) => group.contestants.length > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/50">
          <span className="font-semibold text-ink">{contestants.length}</span> contestant{contestants.length !== 1 ? "s" : ""} confirmed
        </p>
      </div>

      {byCategory.map(({ category, contestants: group }) => (
        <div key={category.id}>
          <div className="mb-4 flex items-center gap-3">
            <h3 className="font-display text-lg font-semibold tracking-[-0.03em] text-ink">
              {category.name}
            </h3>
            <span className="rounded-full border border-primary/16 bg-[#f0f4ff] px-2.5 py-0.5 text-[0.68rem] font-semibold text-primary/80">
              {group.length}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.map((contestant) => {
              const initials = contestant.name
                .split(" ")
                .map((w) => w[0] ?? "")
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={contestant.id}
                  onClick={() => setSelectedContestant(contestant)}
                  className="cursor-pointer overflow-hidden rounded-[1.4rem] border border-primary/10 bg-white/90 shadow-[0_8px_24px_-12px_rgba(7,17,31,0.10)] transition hover:border-primary/24 hover:shadow-[0_12px_32px_-14px_rgba(7,17,31,0.18)]"
                >
                  {/* Photo / avatar */}
                  <div className="relative h-40 bg-[#eff3f8]">
                    {contestant.imageUrl ? (
                      <Image
                        src={contestant.imageUrl}
                        alt={contestant.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="font-display text-4xl font-semibold text-primary/30">
                          {initials}
                        </span>
                      </div>
                    )}
                    {/* Code badge pinned to top-right */}
                    <span className="absolute right-3 top-3 rounded-lg bg-white px-2.5 py-1 font-mono text-[0.7rem] font-bold tracking-widest text-[#07111f] shadow-[0_2px_10px_rgba(7,17,31,0.22)]">
                      {contestant.code}
                    </span>
                  </div>

                  <div className="p-4">
                    <p className="font-display text-base font-semibold leading-tight tracking-[-0.02em] text-ink">
                      {contestant.name}
                    </p>
                    {contestant.email && (
                      <p className="mt-0.5 truncate text-xs text-ink/44">
                        {contestant.email}
                      </p>
                    )}
                    <span className="mt-2.5 inline-flex rounded-full border border-primary/16 bg-[#f0f4ff] px-2.5 py-0.5 text-[0.68rem] font-semibold text-primary/80">
                      {categoryMap[contestant.categoryId] ?? "Unknown"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {selectedContestant && (
        <ContestantDrawer
          contestant={selectedContestant}
          eventId={eventId}
          categoryName={categoryMap[selectedContestant.categoryId] ?? "Unknown"}
          onClose={() => setSelectedContestant(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Votes placeholder tab
// ---------------------------------------------------------------------------

function VotesTab() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.8rem] border border-primary/10 bg-white/60 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff]">
        <svg
          className="h-7 w-7 text-primary/60"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
          />
        </svg>
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold tracking-[-0.03em] text-ink">
        Votes are on their way
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-ink/50">
        Once voting opens, you will see live vote counts, category breakdowns,
        and real-time results right here.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EventManageView({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [togglingOwnVotes, setTogglingOwnVotes] = useState(false);
  const [togglingLeaderboard, setTogglingLeaderboard] = useState(false);

  async function handleToggleOwnVotes() {
    if (!event || togglingOwnVotes) return;
    setTogglingOwnVotes(true);
    try {
      const updated = await updateEventVisibility(eventId, {
        contestantsCanViewOwnVotes: !event.contestantsCanViewOwnVotes,
      });
      setEvent(updated);
    } finally {
      setTogglingOwnVotes(false);
    }
  }

  async function handleToggleLeaderboard() {
    if (!event || togglingLeaderboard) return;
    setTogglingLeaderboard(true);
    try {
      const updated = await updateEventVisibility(eventId, {
        contestantsCanViewLeaderboard: !event.contestantsCanViewLeaderboard,
      });
      setEvent(updated);
    } finally {
      setTogglingLeaderboard(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getEvent(eventId);
        if (!cancelled) setEvent(result);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load event.",
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
    return <p className="text-base text-ink/56">Loading event…</p>;
  }

  if (error) {
    return (
      <div className="rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
        {error}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
        Event not found.
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "nominations", label: "Nominations" },
    { key: "contestants", label: "Contestants" },
    { key: "votes", label: "Votes" },
  ];

  return (
    <div className="mx-auto max-w-6xl pb-16">
      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,249,255,0.97)_58%,rgba(242,246,252,0.95)_100%)] shadow-[0_28px_70px_-50px_rgba(7,17,31,0.22)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(15,76,219,0.16),transparent_42%),radial-gradient(circle_at_top_right,rgba(180,15,23,0.08),transparent_24%)]" />
        <div className="relative grid sm:grid-cols-[260px_minmax(0,1fr)]">
          {/* Flyer */}
          <div className="relative min-h-[200px] overflow-hidden bg-[#eff3f8] sm:min-h-[268px] sm:rounded-tl-[2rem] sm:rounded-bl-[2rem]">
            <Image
              src={event.primaryFlyerUrl}
              alt={event.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_60%,rgba(245,249,255,0.7))]" />
          </div>

          {/* Info */}
          <div className="flex flex-col justify-between gap-6 p-7 sm:p-8">
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-ink/40">
                <Link
                  href="/my-events"
                  className="transition hover:text-primary"
                >
                  My Events
                </Link>
                <span>›</span>
                <span className="max-w-[200px] truncate font-medium text-ink/60">
                  {event.name}
                </span>
              </div>

              <div className="mt-3">
                <span
                  className={`rounded-full border px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.22em] ${getEventStatusBadgeClass(event.status)}`}
                >
                  {formatEventStatus(event.status)}
                </span>
              </div>

              <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-ink sm:text-4xl">
                {event.name}
              </h1>
              <p className="mt-2 max-w-xl line-clamp-3 text-sm leading-6 text-ink/54">
                {event.description}
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/events/${event.id}/edit`}
                className="button-secondary text-sm"
              >
                Edit Event
              </Link>
              {event.status === "DRAFT" && (
                <Link
                  href={`/events/${event.id}/edit`}
                  className="button-primary text-sm"
                >
                  Submit for Review
                </Link>
              )}
              {event.status === "REJECTED" && (
                <Link
                  href={`/events/${event.id}/edit`}
                  className="button-primary text-sm"
                >
                  Edit &amp; Resubmit
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick stats ──────────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Categories", value: String(event.categories.length) },
          {
            label: "Voting starts",
            value: formatDate(event.votingStartAt),
          },
          {
            label: "Nominations open",
            value: formatDate(event.nominationStartAt),
          },
          {
            label: "Nominations close",
            value: formatDate(event.nominationEndAt),
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-[1.4rem] border border-white/80 bg-white/80 p-5 shadow-[0_10px_32px_-18px_rgba(7,17,31,0.18)]"
          >
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
              {label}
            </p>
            <p className="mt-2.5 font-display text-xl font-semibold leading-tight tracking-[-0.03em] text-ink">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="mt-8 flex gap-0 border-b border-primary/10">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`-mb-px border-b-2 px-5 py-3 text-sm font-semibold transition ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-ink/44 hover:text-ink/72"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab panels ───────────────────────────────────────────────────── */}
      <div className="mt-7">
        {activeTab === "overview" && (
          <OverviewTab
            event={event}
            onToggleOwnVotes={handleToggleOwnVotes}
            onToggleLeaderboard={handleToggleLeaderboard}
            togglingOwnVotes={togglingOwnVotes}
            togglingLeaderboard={togglingLeaderboard}
          />
        )}
        {activeTab === "nominations" && (
          <NominationsTab
            eventId={event.id}
            categories={event.categories}
            eventStatus={event.status}
          />
        )}
        {activeTab === "contestants" && (
          <ContestantsTab
            eventId={event.id}
            categories={event.categories}
          />
        )}
        {activeTab === "votes" && <VotesTab />}
      </div>
    </div>
  );
}
