"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppLoadingState } from "@/components/app-loading-state";
import { ApiClientError } from "@/lib/api/client";
import {
  confirmNomination,
  createTicketType,
  deleteContestant,
  disableTicketType,
  getContestantCredentials,
  getEvent,
  listContestants,
  listNominations,
  listTicketTypes,
  regenerateMagicLink,
  rejectNomination,
  updateEventSchedule,
  updateTicketType,
  updateContestant,
  updateEventVisibility,
} from "@/lib/api/events";
import {
  createNominationImageUploadIntent,
  uploadFileToSignedUrl,
} from "@/lib/api/uploads";
import {
  exportEventPaymentsCsv,
  getAdminLeaderboard,
  getEventPayment,
  getEventVotesSummary,
  listEventPayments,
} from "@/lib/api/votes";
import {
  ContestantCredentialsResponse,
  ContestantResponse,
  EventVotesSummaryResponse,
  EventCategoryResponse,
  EventResponse,
  LeaderboardCategory,
  PaymentDetailResponse,
  PaymentListResponse,
  PaymentResponse,
  PaymentStatus,
  NominationResponse,
  NominationStatus,
  TicketTypeResponse,
  UpdateContestantInput,
  UpdateEventScheduleInput,
} from "@/lib/api/types";
import {
  getEventModeLabel,
  hasTicketingEnabled,
  hasVotingEnabled,
} from "@/lib/event-capabilities";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "overview" | "schedule" | "nominations" | "contestants" | "votes" | "leaderboard" | "tickets";
type NomFilter = "all" | NominationStatus;
type PaymentStatusFilter = "all" | PaymentStatus;

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

function formatDateTime(date: string | null): string {
  if (!date) return "Not set";
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateTimeLocalValue(date: string | null): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const offsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}

function dateTimeLocalToIso(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function addToDateTimeLocal(value: string, amountMs: number): string {
  const base = value ? new Date(value) : new Date();
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
  return toDateTimeLocalValue(new Date(safeBase.getTime() + amountMs).toISOString());
}

function formatCurrency(minor: number, currency: string): string {
  if (minor === 0) return "Free";
  return `${currency} ${(minor / 100).toFixed(2)}`;
}

function formatMoney(minor: number | null | undefined, currency?: string | null): string {
  if (minor === null || minor === undefined) return "-";
  return `${currency ?? ""} ${(minor / 100).toFixed(2)}`.trim();
}

function normalizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function validateOptionalPhone(value: string): string | null {
  if (!value) return null;
  if (!/^\d{10}$/.test(value)) return "Phone must be a 10-digit number.";
  if (/^(\d)\1{9}$/.test(value)) return "Enter a real phone number, not repeated digits.";
  return null;
}

function formatPaymentStatus(status: PaymentStatus): string {
  if (status === "SUCCEEDED") return "Succeeded";
  if (status === "PENDING") return "Pending";
  if (status === "FAILED") return "Failed";
  if (status === "ABANDONED") return "Abandoned";
  if (status === "REFUNDED") return "Refunded";
  return status;
}

function getPaymentStatusBadgeClass(status: PaymentStatus): string {
  if (status === "SUCCEEDED") {
    return "border-[#cfe7da] bg-[#eef9f2] text-[#1b6f4b]";
  }
  if (status === "PENDING") {
    return "border-[#fde68a] bg-[#fffbeb] text-[#92400e]";
  }
  if (status === "FAILED") {
    return "border-[#f0cfd3] bg-[#fff2f4] text-accent";
  }
  if (status === "REFUNDED") {
    return "border-[#d8e1f5] bg-[#eef4ff] text-primary";
  }
  return "border-[#dce4f1] bg-[#f7f9fc] text-ink/56";
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

type TicketLifecycleStep =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "APPROVED"
  | "SALES_SCHEDULED"
  | "SALES_OPEN"
  | "SALES_CLOSED"
  | "EVENT_DAY"
  | "ARCHIVED";

const TICKET_LIFECYCLE_STEPS: TicketLifecycleStep[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SALES_SCHEDULED",
  "SALES_OPEN",
  "SALES_CLOSED",
  "EVENT_DAY",
  "ARCHIVED",
];

function formatTicketLifecycleStep(step: TicketLifecycleStep): string {
  const map: Record<TicketLifecycleStep, string> = {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending Approval",
    REJECTED: "Rejected",
    APPROVED: "Approved",
    SALES_SCHEDULED: "Sales Scheduled",
    SALES_OPEN: "Sales Open",
    SALES_CLOSED: "Sales Closed",
    EVENT_DAY: "Event Day",
    ARCHIVED: "Archived",
  };
  return map[step];
}

function getCurrentTicketLifecycleStep(event: EventResponse): TicketLifecycleStep {
  if (event.status === "DRAFT") return "DRAFT";
  if (event.status === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  if (event.status === "REJECTED") return "REJECTED";
  if (event.status === "ARCHIVED") return "ARCHIVED";

  const now = new Date();
  const salesStart = event.ticketSalesStartAt ? new Date(event.ticketSalesStartAt) : null;
  const salesEnd = event.ticketSalesEndAt ? new Date(event.ticketSalesEndAt) : null;
  const eventStart = event.eventStartAt ? new Date(event.eventStartAt) : null;

  if (eventStart && now >= eventStart) return "EVENT_DAY";
  if (salesEnd && now > salesEnd) return "SALES_CLOSED";
  if (salesStart && now < salesStart) return "SALES_SCHEDULED";
  if (salesStart && (!salesEnd || now <= salesEnd)) return "SALES_OPEN";
  return "APPROVED";
}

function getTicketStepState(
  step: TicketLifecycleStep,
  currentStep: TicketLifecycleStep,
  steps: TicketLifecycleStep[],
): StepState {
  const currentIdx = steps.indexOf(currentStep);
  const stepIdx = steps.indexOf(step);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "current";
  return "upcoming";
}

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
  onConfirm: (id: string, nomineeEmail?: string) => void;
  onReject: (id: string, reason: string) => void;
  isConfirming: boolean;
  isRejecting: boolean;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmEmail, setConfirmEmail] = useState(nomination.nomineeEmail ?? "");
  const [confirmEmailError, setConfirmEmailError] = useState<string | null>(null);

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

  function handleConfirm() {
    const email = nomination.nomineeEmail ?? confirmEmail.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setConfirmEmailError("Enter the nominee email before confirming.");
      return;
    }

    if (!emailRe.test(email)) {
      setConfirmEmailError("Enter a valid email address.");
      return;
    }

    setConfirmEmailError(null);
    onConfirm(nomination.id, nomination.nomineeEmail ? undefined : email);
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
          {!nomination.nomineeEmail && (
            <div className="flex items-start gap-2 border-b border-[#fde68a]/60 bg-[#fffbeb] px-5 py-3">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b45309]" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5Zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] leading-4 text-[#92400e]">
                  <span className="font-semibold">No email on record.</span> Add one here so login details can be sent after confirmation.
                </p>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => {
                    setConfirmEmail(e.target.value);
                    if (confirmEmailError) setConfirmEmailError(null);
                  }}
                  placeholder="nominee@example.com"
                  className="mt-2 w-full rounded-lg border border-[#f3d28b] bg-white px-3 py-2 text-xs text-ink outline-none placeholder:text-ink/32 focus:border-[#b45309]/50 focus:ring-2 focus:ring-[#b45309]/10"
                />
                {confirmEmailError && (
                  <p className="mt-1 text-[11px] font-medium text-accent">
                    {confirmEmailError}
                  </p>
                )}
              </div>
            </div>
          )}
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
              onClick={handleConfirm}
              disabled={isConfirming}
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
  onOpenTickets,
  onToggleOwnVotes,
  onToggleLeaderboard,
  onTogglePublicLeaderboard,
  togglingOwnVotes,
  togglingLeaderboard,
  togglingPublicLeaderboard,
}: {
  event: EventResponse;
  onOpenTickets: () => void;
  onToggleOwnVotes: () => void;
  onToggleLeaderboard: () => void;
  onTogglePublicLeaderboard: () => void;
  togglingOwnVotes: boolean;
  togglingLeaderboard: boolean;
  togglingPublicLeaderboard: boolean;
}) {
  if (hasTicketingEnabled(event) && !hasVotingEnabled(event)) {
    return <TicketingOverviewTab event={event} onOpenTickets={onOpenTickets} />;
  }

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

        {/* Visibility */}
        <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-6 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
            Visibility Controls
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
            <div className="border-t border-primary/8" />
            <VisibilityToggle
              label="Public can see the event leaderboard"
              description="Visitors on the public event page can view the live leaderboard."
              checked={event.publicCanViewLeaderboard}
              loading={togglingPublicLeaderboard}
              onToggle={onTogglePublicLeaderboard}
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
            <p className="text-sm text-ink/46">Add at least one voting category before submitting this event.</p>
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

function TicketingOverviewTab({
  event,
  onOpenTickets,
}: {
  event: EventResponse;
  onOpenTickets: () => void;
}) {
  const [ticketTypes, setTicketTypes] = useState<TicketTypeResponse[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [ticketError, setTicketError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTicketTypes() {
      setIsLoadingTickets(true);
      setTicketError(null);
      try {
        const list = await listTicketTypes(event.id);
        if (!cancelled) setTicketTypes(list);
      } catch (loadError) {
        if (!cancelled) {
          setTicketError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load ticket types.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingTickets(false);
      }
    }

    void loadTicketTypes();
    return () => {
      cancelled = true;
    };
  }, [event.id]);

  const displaySteps =
    event.status === "REJECTED"
      ? (["DRAFT", "PENDING_APPROVAL", "REJECTED"] as TicketLifecycleStep[])
      : TICKET_LIFECYCLE_STEPS;
  const currentStep = getCurrentTicketLifecycleStep(event);
  const activeTicketTypes = ticketTypes.filter((type) => type.isActive);
  const disabledTicketTypes = ticketTypes.length - activeTicketTypes.length;
  const totalSold = ticketTypes.reduce((sum, type) => sum + type.quantitySold, 0);
  const limitedCapacity = ticketTypes.reduce(
    (sum, type) => sum + (type.quantityAvailable ?? 0),
    0,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-6 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
                Ticketing Lifecycle
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink/52">
                Track approval, ticket sales, and event day readiness without the voting workflow.
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] ${getEventStatusBadgeClass(event.status)}`}>
              {formatTicketLifecycleStep(currentStep)}
            </span>
          </div>

          <div className="mt-6">
            {displaySteps.map((step, i) => {
              const isLast = i === displaySteps.length - 1;
              const isRejectedStep = step === "REJECTED";
              const state = isRejectedStep
                ? event.status === "REJECTED"
                  ? "current"
                  : "upcoming"
                : getTicketStepState(step, currentStep, displaySteps);

              return (
                <div key={step} className="flex gap-3">
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
                        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
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
                      {formatTicketLifecycleStep(step)}
                    </p>
                    {state === "current" && isRejectedStep && event.rejectionReason && (
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

        <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-6 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
            Ticketing Dates
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Event Starts", value: formatDateTime(event.eventStartAt) },
              { label: "Event Ends", value: formatDateTime(event.eventEndAt) },
              { label: "Sales Open", value: formatDateTime(event.ticketSalesStartAt) },
              { label: "Sales Close", value: formatDateTime(event.ticketSalesEndAt) },
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

        <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-6 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
            Venue
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#edf0f6] bg-[#f7f9fc] p-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/38">
                Venue Name
              </p>
              <p className="mt-1.5 text-sm font-semibold text-ink">
                {event.venueName || "Not set"}
              </p>
            </div>
            <div className="rounded-xl border border-[#edf0f6] bg-[#f7f9fc] p-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/38">
                Address
              </p>
              <p className="mt-1.5 text-sm font-semibold text-ink">
                {event.venueAddress || "Not set"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-6 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)] lg:self-start">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
              Ticket Types
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
              {isLoadingTickets ? "..." : ticketTypes.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenTickets}
            className="rounded-full border border-primary/18 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/5"
          >
            Manage
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <MetricTile label="Active" value={isLoadingTickets ? "..." : String(activeTicketTypes.length)} />
          <MetricTile label="Disabled" value={isLoadingTickets ? "..." : String(disabledTicketTypes)} />
          <MetricTile label="Tickets sold" value={isLoadingTickets ? "..." : String(totalSold)} />
          <MetricTile
            label="Limited capacity"
            value={isLoadingTickets ? "..." : limitedCapacity ? String(limitedCapacity) : "Unlimited"}
          />
        </div>

        {ticketError && (
          <p className="mt-5 rounded-xl border border-accent/16 bg-accent/5 px-3 py-2 text-sm font-medium text-accent">
            {ticketError}
          </p>
        )}

        {!isLoadingTickets && !ticketError && ticketTypes.length === 0 && (
          <div className="mt-5 rounded-xl border border-[#edf0f6] bg-[#f7f9fc] p-4">
            <p className="text-sm font-semibold text-ink">No ticket types yet</p>
            <p className="mt-1 text-sm leading-6 text-ink/50">
              Add at least one paid ticket type before selling tickets.
            </p>
            <button
              type="button"
              onClick={onOpenTickets}
              className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90"
            >
              Add ticket type
            </button>
          </div>
        )}

        {!isLoadingTickets && ticketTypes.length > 0 && (
          <div className="mt-5 space-y-3">
            {ticketTypes.slice(0, 4).map((type) => (
              <div
                key={type.id}
                className="rounded-xl border border-[#edf0f6] bg-[#f7f9fc] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{type.name}</p>
                    <p className="mt-0.5 text-xs text-ink/46">
                      {type.quantitySold} sold
                      {type.quantityAvailable === null
                        ? " · unlimited"
                        : ` · ${Math.max(type.quantityAvailable - type.quantitySold, 0)} left`}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-primary/16 bg-[#f0f4ff] px-2.5 py-0.5 text-[0.68rem] font-semibold text-primary/80">
                    {formatCurrency(type.priceMinor, type.currency)}
                  </span>
                </div>
              </div>
            ))}
            {ticketTypes.length > 4 && (
              <button
                type="button"
                onClick={onOpenTickets}
                className="w-full rounded-full border border-primary/14 px-4 py-2 text-xs font-semibold text-ink/58 transition hover:bg-primary/5"
              >
                View all {ticketTypes.length} ticket types
              </button>
            )}
          </div>
        )}
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

  async function handleConfirm(nominationId: string, nomineeEmail?: string) {
    setConfirmingId(nominationId);
    try {
      const updated = await confirmNomination(eventId, nominationId, {
        nomineeEmail,
      });
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
    return (
      <AppLoadingState
        compact
        label="Loading nominations"
        detail="Fetching submissions and review status."
      />
    );
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
              ? "No nominations have been submitted for review yet."
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
  categories,
  onUpdated,
  onDeleted,
  onClose,
}: {
  contestant: ContestantResponse;
  eventId: string;
  categories: EventCategoryResponse[];
  onUpdated: (contestant: ContestantResponse) => void;
  onDeleted: (contestantId: string) => void;
  onClose: () => void;
}) {
  const [creds, setCreds] = useState<ContestantCredentialsResponse | null>(null);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(contestant.name);
  const [phone, setPhone] = useState(contestant.phone ?? "");
  const [categoryId, setCategoryId] = useState(contestant.categoryId);
  const [imageUrl, setImageUrl] = useState<string | null>(contestant.imageUrl);
  const [imageKey, setImageKey] = useState<string | null>(contestant.imageKey);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const currentCategoryName =
    categories.find((category) => category.id === categoryId)?.name ?? "Unknown";

  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    let cancelled = false;

    async function loadCredentials() {
      setLoadingCreds(true);
      try {
        const c = await getContestantCredentials(eventId, contestant.id);
        if (!cancelled) setCreds(c);
      } catch {
        if (!cancelled) setCreds(null);
      } finally {
        if (!cancelled) setLoadingCreds(false);
      }
    }

    void loadCredentials();
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

  async function handlePhotoUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      setFormError("Please select an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFormError("Image must be smaller than 8 MB.");
      return;
    }

    setFormError(null);
    setUploadingPhoto(true);
    try {
      const intent = await createNominationImageUploadIntent({
        fileName: file.name,
        contentType: file.type,
        eventId,
        nominationId: contestant.nominationId,
      });
      await uploadFileToSignedUrl(intent.uploadUrl, file);
      setImageUrl(intent.publicUrl);
      setImageKey(intent.key);
    } catch (uploadError) {
      setFormError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload photo.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSaveDetails() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setFormError("Contestant name is required.");
      return;
    }

    if (!categoryId) {
      setFormError("Choose a category.");
      return;
    }

    const phoneError = validateOptionalPhone(trimmedPhone);
    if (phoneError) {
      setFormError(phoneError);
      return;
    }

    const input: UpdateContestantInput = {
      name: trimmedName,
      categoryId,
      phone: trimmedPhone || null,
      imageUrl,
      imageKey,
    };

    setSaving(true);
    setFormError(null);
    try {
      const updated = await updateContestant(eventId, contestant.id, input);
      onUpdated(updated);
    } catch (saveError) {
      setFormError(
        saveError instanceof ApiClientError
          ? saveError.message
          : "Unable to update contestant.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteContestant() {
    const confirmed = window.confirm(
      "Remove this contestant from public voting and USSD lookup? Existing votes and payment records will be kept for audit.",
    );
    if (!confirmed) return;

    setDeleting(true);
    setFormError(null);
    try {
      await deleteContestant(eventId, contestant.id);
      onDeleted(contestant.id);
      onClose();
    } catch (deleteError) {
      setFormError(
        deleteError instanceof ApiClientError
          ? deleteError.message
          : "Unable to delete contestant.",
      );
    } finally {
      setDeleting(false);
    }
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
              {imageUrl ? (
                <Image src={imageUrl} alt={name} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="font-display text-xl font-semibold text-primary/40">{initials}</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold leading-tight tracking-[-0.03em] text-ink">
                {name}
              </p>
              {contestant.email && (
                <p className="mt-0.5 truncate text-sm text-ink/48">{contestant.email}</p>
              )}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded-lg bg-[#07111f] px-2 py-0.5 font-mono text-[0.68rem] font-bold tracking-widest text-white">
                  {contestant.code}
                </span>
                <span className="rounded-full border border-primary/16 bg-[#f0f4ff] px-2.5 py-0.5 text-[0.68rem] font-semibold text-primary/80">
                  {currentCategoryName}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-primary/8 px-6 py-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
              Edit details
            </p>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-ink/52">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-primary/12 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary/42 focus:ring-2 focus:ring-primary/10"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink/52">Category</span>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-primary/12 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary/42 focus:ring-2 focus:ring-primary/10"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink/52">Phone</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
                  inputMode="numeric"
                  placeholder="0240000000"
                  className="mt-1.5 w-full rounded-xl border border-primary/12 bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-primary/42 focus:ring-2 focus:ring-primary/10"
                />
              </label>
              <div>
                <span className="text-xs font-semibold text-ink/52">Photo</span>
                <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-primary/12 bg-[#f7f9fc] p-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#e4ecf8]">
                    {imageUrl ? (
                      <Image src={imageUrl} alt={name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-semibold text-primary/50">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-wrap gap-2">
                    <label className="cursor-pointer rounded-full border border-primary/18 bg-white px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5">
                      {uploadingPhoto ? "Uploading..." : "Change photo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploadingPhoto}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) await handlePhotoUpload(file);
                        }}
                      />
                    </label>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl(null);
                          setImageKey(null);
                        }}
                        className="rounded-full border border-[#f0cfd3] bg-white px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-[#fff2f4]"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {formError && (
                <p className="rounded-xl border border-accent/14 bg-accent/5 px-3 py-2 text-xs font-medium text-accent">
                  {formError}
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleSaveDetails()}
                disabled={saving || uploadingPhoto}
                className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>

          <div className="border-t border-primary/8 px-6 py-5 space-y-5">
            {loadingCreds ? (
              <AppLoadingState
                compact
                label="Loading login info"
                detail="Checking contestant account access."
              />
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

          <div className="border-t border-primary/8 px-6 py-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
              Remove contestant
            </p>
            <div className="mt-4 rounded-xl border border-[#f0cfd3] bg-[#fff7f8] p-4">
              <p className="text-sm font-semibold text-[#8a1118]">
                Remove from voting
              </p>
              <p className="mt-1 text-xs leading-5 text-[#8a1118]/70">
                This hides the contestant from public voting, USSD lookup, leaderboard, and contestant lists. Existing votes and payment records are kept.
              </p>
              <button
                type="button"
                onClick={() => void handleDeleteContestant()}
                disabled={deleting}
                className="mt-4 w-full rounded-full bg-[#b40f17] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#990d14] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {deleting ? "Removing..." : "Remove contestant"}
              </button>
            </div>
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

  function handleContestantUpdated(updated: ContestantResponse) {
    setContestants((current) =>
      current.map((contestant) =>
        contestant.id === updated.id ? updated : contestant,
      ),
    );
    setSelectedContestant(updated);
  }

  function handleContestantDeleted(contestantId: string) {
    setContestants((current) =>
      current.filter((contestant) => contestant.id !== contestantId),
    );
    setSelectedContestant(null);
  }

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

  if (isLoading) {
    return (
      <AppLoadingState
        compact
        label="Loading contestants"
        detail="Fetching confirmed contestant profiles."
      />
    );
  }

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
          No confirmed contestants yet
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
          key={selectedContestant.id}
          contestant={selectedContestant}
          eventId={eventId}
          categories={categories}
          onUpdated={handleContestantUpdated}
          onDeleted={handleContestantDeleted}
          onClose={() => setSelectedContestant(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ticket types tab
// ---------------------------------------------------------------------------

function TicketTypesTab({ eventId }: { eventId: string }) {
  const [ticketTypes, setTicketTypes] = useState<TicketTypeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [quantityAvailable, setQuantityAvailable] = useState("");

  async function loadTicketTypes() {
    setIsLoading(true);
    setError(null);
    try {
      setTicketTypes(await listTicketTypes(eventId));
    } catch (loadError) {
      setError(
        loadError instanceof ApiClientError
          ? loadError.message
          : "Unable to load ticket types.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTicketTypes();
  }, [eventId]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setCurrency("GHS");
    setQuantityAvailable("");
  }

  function startEditing(ticketType: TicketTypeResponse) {
    setEditingId(ticketType.id);
    setName(ticketType.name);
    setDescription(ticketType.description ?? "");
    setPrice((ticketType.priceMinor / 100).toString());
    setCurrency(ticketType.currency);
    setQuantityAvailable(ticketType.quantityAvailable?.toString() ?? "");
  }

  async function handleSubmit() {
    setError(null);
    const priceMinor = Math.round(Number.parseFloat(price || "0") * 100);
    const quantity = quantityAvailable ? Number.parseInt(quantityAvailable, 10) : null;

    if (!name.trim()) {
      setError("Ticket type name is required.");
      return;
    }
    if (!Number.isFinite(priceMinor) || priceMinor < 50) {
      setError("Ticket price must be at least GHS 0.50.");
      return;
    }
    if (quantityAvailable && (!Number.isInteger(quantity) || quantity! < 1)) {
      setError("Quantity must be at least 1 when set.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        priceMinor,
        currency: currency.trim().toUpperCase(),
        quantityAvailable: quantity,
        sortOrder: editingId
          ? ticketTypes.find((type) => type.id === editingId)?.sortOrder
          : ticketTypes.length,
      };

      if (editingId) {
        const updated = await updateTicketType(eventId, editingId, payload);
        setTicketTypes((current) =>
          current.map((type) => (type.id === updated.id ? updated : type)),
        );
      } else {
        const created = await createTicketType(eventId, payload);
        setTicketTypes((current) => [...current, created]);
      }
      resetForm();
    } catch (saveError) {
      setError(
        saveError instanceof ApiClientError
          ? saveError.message
          : "Unable to save ticket type.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable(ticketType: TicketTypeResponse) {
    setError(null);
    try {
      await disableTicketType(eventId, ticketType.id);
      setTicketTypes((current) =>
        current.filter((type) => type.id !== ticketType.id),
      );
      if (editingId === ticketType.id) resetForm();
    } catch (disableError) {
      setError(
        disableError instanceof ApiClientError
          ? disableError.message
          : "Unable to disable ticket type.",
      );
    }
  }

  const totalSold = ticketTypes.reduce((sum, type) => sum + type.quantitySold, 0);
  const grossCapacity = ticketTypes.reduce(
    (sum, type) => sum + (type.quantityAvailable ?? 0),
    0,
  );

  if (isLoading) {
    return (
      <AppLoadingState
        compact
        label="Loading ticket types"
        detail="Fetching ticket tiers and inventory."
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricTile label="Ticket types" value={String(ticketTypes.length)} />
          <MetricTile label="Tickets sold" value={String(totalSold)} />
          <MetricTile
            label="Limited capacity"
            value={grossCapacity ? String(grossCapacity) : "Unlimited"}
          />
        </div>

        {ticketTypes.length === 0 ? (
          <div className="rounded-[1.5rem] border border-primary/10 bg-white/70 p-10 text-center">
            <p className="font-display text-xl font-semibold tracking-[-0.03em] text-ink">
              No ticket types yet
            </p>
            <p className="mt-2 text-sm leading-6 text-ink/50">
              Add Regular, VIP, Early Bird, or any paid ticket tier this event needs.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {ticketTypes.map((ticketType) => {
              const remaining =
                ticketType.quantityAvailable === null
                  ? null
                  : Math.max(ticketType.quantityAvailable - ticketType.quantitySold, 0);
              return (
                <div
                  key={ticketType.id}
                  className="rounded-[1.5rem] border border-primary/10 bg-white/90 p-5 shadow-[0_10px_30px_-22px_rgba(7,17,31,0.22)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-semibold tracking-[-0.03em] text-ink">
                        {ticketType.name}
                      </p>
                      {ticketType.description && (
                        <p className="mt-1 text-sm leading-6 text-ink/50">
                          {ticketType.description}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full border border-primary/16 bg-[#f0f4ff] px-3 py-1 text-xs font-semibold text-primary">
                      {formatCurrency(ticketType.priceMinor, ticketType.currency)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-[#f7f9fc] px-4 py-3">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-ink/36">
                        Sold
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {ticketType.quantitySold}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f7f9fc] px-4 py-3">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-ink/36">
                        Remaining
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {remaining === null ? "Unlimited" : remaining}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(ticketType)}
                      className="rounded-full border border-primary/18 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/5"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDisable(ticketType)}
                      className="rounded-full border border-accent/18 px-4 py-2 text-xs font-semibold text-accent transition hover:bg-accent/5"
                    >
                      Disable
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <aside className="rounded-[1.5rem] border border-primary/10 bg-white/90 p-5 shadow-[0_14px_38px_-26px_rgba(7,17,31,0.22)] xl:sticky xl:top-8 xl:self-start">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
          {editingId ? "Edit ticket type" : "New ticket type"}
        </p>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-ink/60">Name</span>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-primary/12 bg-[#fbfcff] px-3 text-sm outline-none transition focus:border-primary/40"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Regular"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/60">Description</span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-xl border border-primary/12 bg-[#fbfcff] px-3 py-2 text-sm outline-none transition focus:border-primary/40"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Standard access ticket"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-ink/60">Price</span>
              <input
                type="number"
                min="0.5"
                step="0.01"
                className="mt-2 h-11 w-full rounded-xl border border-primary/12 bg-[#fbfcff] px-3 text-sm outline-none transition focus:border-primary/40"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="50"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink/60">Currency</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-primary/12 bg-[#fbfcff] px-3 text-sm uppercase outline-none transition focus:border-primary/40"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-ink/60">Quantity available</span>
            <input
              type="number"
              min="1"
              className="mt-2 h-11 w-full rounded-xl border border-primary/12 bg-[#fbfcff] px-3 text-sm outline-none transition focus:border-primary/40"
              value={quantityAvailable}
              onChange={(e) => setQuantityAvailable(e.target.value)}
              placeholder="Leave blank for unlimited"
            />
          </label>
          {error && (
            <p className="rounded-xl border border-accent/16 bg-accent/5 px-3 py-2 text-sm font-medium text-accent">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Add ticket"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-primary/14 px-4 py-2.5 text-sm font-semibold text-ink/58 transition hover:bg-primary/5"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Votes tab
// ---------------------------------------------------------------------------

const PAYMENT_FILTERS: { key: PaymentStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "SUCCEEDED", label: "Succeeded" },
  { key: "PENDING", label: "Pending" },
  { key: "FAILED", label: "Failed" },
  { key: "ABANDONED", label: "Abandoned" },
  { key: "REFUNDED", label: "Refunded" },
];

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[1.3rem] border border-primary/10 bg-white/86 p-5 shadow-[0_10px_32px_-20px_rgba(7,17,31,0.18)]">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink/44">{hint}</p>}
    </div>
  );
}

function PaymentDetailDrawer({
  detail,
  onClose,
}: {
  detail: PaymentDetailResponse;
  onClose: () => void;
}) {
  const payment = detail.payment;
  const amount = payment.amountPaidMinor ?? payment.amountMinor;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#07111f]/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-[0_0_60px_-20px_rgba(7,17,31,0.36)]">
        <div className="flex items-center justify-between border-b border-primary/10 px-6 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
            Payment Detail
          </p>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink/40 transition hover:bg-primary/8 hover:text-ink"
            aria-label="Close payment detail"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-xl font-semibold leading-tight tracking-[-0.03em] text-ink">
                {payment.voterName || "Unnamed voter"}
              </p>
              <p className="mt-1 truncate text-sm text-ink/48">
                {payment.voterEmail}
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] ${getPaymentStatusBadgeClass(payment.status)}`}
            >
              {formatPaymentStatus(payment.status)}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricTile
              label="Amount"
              value={formatMoney(amount, payment.currency)}
              hint={`Fee ${formatMoney(payment.feeMinor, payment.currency)}`}
            />
            <MetricTile
              label="Net"
              value={formatMoney(
                payment.amountPaidMinor != null && payment.feeMinor != null
                  ? payment.amountPaidMinor - payment.feeMinor
                  : null,
                payment.currency,
              )}
              hint={payment.channel ?? "Channel pending"}
            />
          </div>

          <div className="mt-6 space-y-3 border-t border-primary/10 pt-5 text-sm">
            {[
              ["Contestant", `${payment.contestantName ?? "Unknown"}${payment.contestantCode ? ` (${payment.contestantCode})` : ""}`],
              ["Category", payment.categoryName ?? "Unknown"],
              ["Reference", payment.reference],
              ["Provider ref", payment.providerRef ?? "-"],
              ["Card last4", payment.cardLast4 ?? "-"],
              ["Mobile", payment.mobileNumber ?? "-"],
              ["Initialized", formatDateTime(payment.initializedAt)],
              ["Paid", formatDateTime(payment.paidAt)],
              ["Failed", formatDateTime(payment.failedAt)],
              ["Failure reason", payment.failureReason ?? "-"],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/34">
                  {label}
                </span>
                <span className="min-w-0 break-words text-ink/68">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-7 border-t border-primary/10 pt-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
              Webhook Timeline
            </p>
            {detail.webhookEvents.length === 0 ? (
              <p className="mt-3 rounded-xl border border-[#dce4f1] bg-[#f7f9fc] px-4 py-3 text-sm text-ink/48">
                No webhook deliveries recorded for this payment.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {detail.webhookEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-primary/10 bg-[#fbfcff] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-semibold text-ink">
                          {event.eventType}
                        </p>
                        <p className="mt-1 text-xs text-ink/42">
                          {formatDateTime(event.receivedAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${
                          event.signatureValid
                            ? "border-[#cfe7da] bg-[#eef9f2] text-[#1b6f4b]"
                            : "border-[#f0cfd3] bg-[#fff2f4] text-accent"
                        }`}
                      >
                        {event.signatureValid ? "Valid" : "Invalid"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ink/44">
                      {event.processed
                        ? `Processed ${formatDateTime(event.processedAt)}`
                        : "Not processed"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function VotesTab({ eventId }: { eventId: string }) {
  const [summary, setSummary] = useState<EventVotesSummaryResponse | null>(null);
  const [payments, setPayments] = useState<PaymentListResponse | null>(null);
  const [status, setStatus] = useState<PaymentStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState<PaymentDetailResponse | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [votesSummary, paymentList] = await Promise.all([
          getEventVotesSummary(eventId),
          listEventPayments(eventId, {
            status: status === "all" ? undefined : status,
            page,
            pageSize: 10,
          }),
        ]);
        if (!cancelled) {
          setSummary(votesSummary);
          setPayments(paymentList);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load vote records.",
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
  }, [eventId, page, status]);

  const statusCounts = useMemo(() => {
    const counts = new Map<PaymentStatus, number>();
    for (const bucket of summary?.payments.byStatus ?? []) {
      counts.set(bucket.status, bucket.count);
    }
    return counts;
  }, [summary]);

  const pageCount = payments
    ? Math.max(1, Math.ceil(payments.total / payments.pageSize))
    : 1;
  const currency = summary?.payments.currency ?? payments?.rows[0]?.currency ?? null;

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportEventPaymentsCsv(eventId, {
        status: status === "all" ? undefined : status,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payments-${eventId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function openPayment(payment: PaymentResponse) {
    setLoadingDetailId(payment.id);
    try {
      const result = await getEventPayment(eventId, payment.id);
      setDetail(result);
    } finally {
      setLoadingDetailId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Total votes"
          value={String(summary?.votes.totalVotes ?? 0)}
          hint={`${summary?.votes.uniqueVoters ?? 0} unique voters`}
        />
        <MetricTile
          label="Paid votes"
          value={String(summary?.votes.paidVotes ?? 0)}
          hint={`${summary?.votes.freeVotes ?? 0} free votes`}
        />
        <MetricTile
          label="Gross collected"
          value={formatMoney(summary?.payments.grossMinor ?? 0, currency)}
          hint={`${summary?.payments.successCount ?? 0} successful payments`}
        />
        <MetricTile
          label="Net after fees"
          value={formatMoney(summary?.payments.netMinor ?? 0, currency)}
          hint={`${formatMoney(summary?.payments.feesMinor ?? 0, currency)} fees`}
        />
      </div>

      <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 shadow-[0_12px_38px_-24px_rgba(7,17,31,0.2)]">
        <div className="flex flex-col gap-4 border-b border-primary/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
              Payment Records
            </p>
            <p className="mt-1 text-sm text-ink/48">
              {payments ? `${payments.total} records` : "Loading records"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PAYMENT_FILTERS.map((filter) => {
              const count =
                filter.key === "all"
                  ? summary?.payments.totalCount
                  : statusCounts.get(filter.key);
              return (
                <button
                  key={filter.key}
                  onClick={() => {
                    setStatus(filter.key);
                    setPage(1);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    status === filter.key
                      ? "border-primary bg-primary text-white"
                      : "border-primary/12 bg-white text-ink/52 hover:border-primary/28 hover:text-ink"
                  }`}
                >
                  {filter.label}
                  {count !== undefined && (
                    <span className="ml-1.5 opacity-70">{count}</span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => void handleExport()}
              disabled={exporting || isLoading}
              className="rounded-full border border-[#cfe7da] bg-[#eef9f2] px-4 py-1.5 text-xs font-semibold text-[#1b6f4b] transition hover:bg-[#dcf5e8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>

        {error && (
          <div className="m-5 rounded-[1rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-[#f7f9fc] text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink/38">
              <tr>
                <th className="px-5 py-3">Voter</th>
                <th className="px-5 py-3">Contestant</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Fee</th>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/8">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-5 py-10">
                    <AppLoadingState
                      compact
                      label="Loading payment records"
                      detail="Fetching this event's ledger."
                    />
                  </td>
                </tr>
              )}
              {!isLoading && payments?.rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <p className="font-display text-lg font-semibold tracking-[-0.03em] text-ink">
                      No payment records
                    </p>
                    <p className="mt-1 text-sm text-ink/44">
                      Confirmed and pending paid votes will appear here.
                    </p>
                  </td>
                </tr>
              )}
              {!isLoading &&
                payments?.rows.map((payment) => (
                  <tr
                    key={payment.id}
                    className="transition hover:bg-[#f8fbff]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink">
                        {payment.voterName || "Unnamed voter"}
                      </p>
                      <p className="mt-0.5 max-w-[220px] truncate text-xs text-ink/44">
                        {payment.voterEmail}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink">
                        {payment.contestantName ?? "Unknown contestant"}
                      </p>
                      <p className="mt-0.5 text-xs text-ink/44">
                        {payment.contestantCode ?? "-"} · {payment.categoryName ?? "Unknown category"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${getPaymentStatusBadgeClass(payment.status)}`}
                      >
                        {formatPaymentStatus(payment.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-xs text-ink/70">
                      {formatMoney(
                        payment.amountPaidMinor ?? payment.amountMinor,
                        payment.currency,
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-xs text-ink/54">
                      {formatMoney(payment.feeMinor, payment.currency)}
                    </td>
                    <td className="px-5 py-4 text-ink/56">
                      {payment.channel ?? "-"}
                    </td>
                    <td className="px-5 py-4 text-ink/56">
                      {formatDateTime(payment.paidAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => void openPayment(payment)}
                        disabled={loadingDetailId === payment.id}
                        className="rounded-full border border-primary/16 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {loadingDetailId === payment.id ? "Opening..." : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {payments && payments.total > 0 && (
          <div className="flex items-center justify-between border-t border-primary/10 px-5 py-4 text-sm text-ink/48">
            <span>
              Page {payments.page} of {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="rounded-full border border-primary/12 px-3 py-1.5 text-xs font-semibold text-ink/56 transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount || isLoading}
                className="rounded-full border border-primary/12 px-3 py-1.5 text-xs font-semibold text-ink/56 transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <PaymentDetailDrawer detail={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leaderboard tab
// ---------------------------------------------------------------------------

const LEADERBOARD_BAR_COLORS = [
  "#0f4cdb",
  "#2f6fed",
  "#5b8def",
  "#8aafff",
  "#b9ccff",
  "#d8e1f5",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function LeaderboardTab({ eventId }: { eventId: string }) {
  const [categories, setCategories] = useState<LeaderboardCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAdminLeaderboard(eventId);
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

  const totals = useMemo(() => {
    let totalVotes = 0;
    let totalContestants = 0;
    for (const cat of categories) {
      totalContestants += cat.contestants.length;
      for (const entry of cat.contestants) {
        totalVotes += entry.voteCount;
      }
    }
    return { totalVotes, totalContestants };
  }, [categories]);

  const populated = categories.filter((c) => c.contestants.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-primary/10 bg-white/86 p-5 shadow-[0_12px_38px_-24px_rgba(7,17,31,0.2)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
            Live leaderboard
          </p>
          <p className="mt-1 text-sm text-ink/56">
            Admin view — visible regardless of public visibility settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-mono text-xs text-ink/40">
              {totals.totalContestants} contestants · {totals.totalVotes} votes
            </p>
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={isLoading}
            className="rounded-full border border-primary/16 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[1.25rem] border border-accent/18 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
          {error}
        </div>
      )}

      {isLoading && !error && (
        <AppLoadingState
          compact
          label="Loading leaderboard"
          detail="Fetching current vote standings."
        />
      )}

      {!isLoading && !error && populated.length === 0 && (
        <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-10 text-center shadow-[0_12px_38px_-24px_rgba(7,17,31,0.2)]">
          <p className="font-display text-lg font-semibold tracking-[-0.03em] text-ink">
            No counted votes yet
          </p>
          <p className="mt-1 text-sm text-ink/44">
            Once contestants start receiving votes, the leaderboard will appear here.
          </p>
        </div>
      )}

      {!isLoading && !error &&
        populated.map((cat) => <LeaderboardCategoryPanel key={cat.categoryId} category={cat} />)}
    </div>
  );
}

function LeaderboardCategoryPanel({ category }: { category: LeaderboardCategory }) {
  const top = category.contestants.slice(0, 10);
  const chartData = top.map((entry) => ({
    name: entry.name,
    code: entry.code,
    rank: entry.rank,
    votes: entry.voteCount,
  }));
  const totalCategoryVotes = category.contestants.reduce(
    (sum, entry) => sum + entry.voteCount,
    0,
  );

  return (
    <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 shadow-[0_12px_38px_-24px_rgba(7,17,31,0.2)]">
      <div className="flex flex-col gap-1 border-b border-primary/10 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="font-display text-base font-semibold tracking-tight text-ink">
          {category.categoryName}
        </p>
        <p className="font-mono text-xs text-ink/44">
          {category.contestants.length} contestants · {totalCategoryVotes} votes
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="border-b border-primary/8 p-5 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink/40">
            Top {top.length}
          </p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 6, right: 24, bottom: 6, left: 8 }}
              >
                <CartesianGrid stroke="#eef2f9" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#5d6577" }}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="code"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tick={{ fontSize: 11, fill: "#5d6577" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(15,76,219,0.06)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(15,76,219,0.12)",
                    fontSize: 12,
                    boxShadow: "0 12px 28px -18px rgba(7,17,31,0.2)",
                  }}
                  formatter={(value) => [`${value} votes`, "Votes"]}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload as
                      | { name: string; rank: number }
                      | undefined;
                    return item ? `#${item.rank} · ${item.name}` : String(label);
                  }}
                />
                <Bar dataKey="votes" radius={[0, 6, 6, 0]}>
                  {chartData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={
                        LEADERBOARD_BAR_COLORS[
                          Math.min(idx, LEADERBOARD_BAR_COLORS.length - 1)
                        ]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5">
          <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink/40">
            Standings
          </p>
          <ol className="flex flex-col gap-2">
            {category.contestants.map((entry) => {
              const share =
                totalCategoryVotes > 0
                  ? (entry.voteCount / totalCategoryVotes) * 100
                  : 0;
              return (
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
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-ink">
                      {entry.name}
                    </span>
                    <span className="font-mono text-[0.65rem] text-ink/40">
                      {share.toFixed(1)}%
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold text-ink/50 ring-1 ring-ink/8">
                    {entry.code}
                  </span>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    {entry.voteCount}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

function ScheduleTab({
  event,
  onUpdated,
}: {
  event: EventResponse;
  onUpdated: (event: EventResponse) => void;
}) {
  const [nominationStartAt, setNominationStartAt] = useState(toDateTimeLocalValue(event.nominationStartAt));
  const [nominationEndAt, setNominationEndAt] = useState(toDateTimeLocalValue(event.nominationEndAt));
  const [votingStartAt, setVotingStartAt] = useState(toDateTimeLocalValue(event.votingStartAt));
  const [votingEndAt, setVotingEndAt] = useState(toDateTimeLocalValue(event.votingEndAt));
  const [ticketSalesStartAt, setTicketSalesStartAt] = useState(toDateTimeLocalValue(event.ticketSalesStartAt));
  const [ticketSalesEndAt, setTicketSalesEndAt] = useState(toDateTimeLocalValue(event.ticketSalesEndAt));
  const [eventStartAt, setEventStartAt] = useState(toDateTimeLocalValue(event.eventStartAt));
  const [eventEndAt, setEventEndAt] = useState(toDateTimeLocalValue(event.eventEndAt));
  const [venueName, setVenueName] = useState(event.venueName ?? "");
  const [venueAddress, setVenueAddress] = useState(event.venueAddress ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNominationStartAt(toDateTimeLocalValue(event.nominationStartAt));
    setNominationEndAt(toDateTimeLocalValue(event.nominationEndAt));
    setVotingStartAt(toDateTimeLocalValue(event.votingStartAt));
    setVotingEndAt(toDateTimeLocalValue(event.votingEndAt));
    setTicketSalesStartAt(toDateTimeLocalValue(event.ticketSalesStartAt));
    setTicketSalesEndAt(toDateTimeLocalValue(event.ticketSalesEndAt));
    setEventStartAt(toDateTimeLocalValue(event.eventStartAt));
    setEventEndAt(toDateTimeLocalValue(event.eventEndAt));
    setVenueName(event.venueName ?? "");
    setVenueAddress(event.venueAddress ?? "");
  }, [event.id, event.updatedAt]);

  const votingHasStarted =
    event.status === "VOTING_LIVE" ||
    event.status === "VOTING_CLOSED" ||
    new Date(event.votingStartAt).getTime() <= Date.now();

  function now() {
    return toDateTimeLocalValue(new Date().toISOString());
  }

  async function handleSave() {
    const input: UpdateEventScheduleInput = {};

    if (hasVotingEnabled(event)) {
      if (!votingHasStarted) {
        input.nominationStartAt = dateTimeLocalToIso(nominationStartAt);
        input.nominationEndAt = dateTimeLocalToIso(nominationEndAt);
        const votingStartIso = dateTimeLocalToIso(votingStartAt);
        if (votingStartIso) input.votingStartAt = votingStartIso;
      }
      const votingEndIso = dateTimeLocalToIso(votingEndAt);
      if (votingEndIso) input.votingEndAt = votingEndIso;
    }

    if (hasTicketingEnabled(event)) {
      input.ticketSalesStartAt = dateTimeLocalToIso(ticketSalesStartAt);
      input.ticketSalesEndAt = dateTimeLocalToIso(ticketSalesEndAt);
      input.eventStartAt = dateTimeLocalToIso(eventStartAt);
      input.eventEndAt = dateTimeLocalToIso(eventEndAt);
      input.venueName = venueName.trim() || null;
      input.venueAddress = venueAddress.trim() || null;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateEventSchedule(event.id, input);
      onUpdated(updated);
      setMessage("Schedule updated.");
    } catch (saveError) {
      setError(
        saveError instanceof ApiClientError
          ? saveError.message
          : "Unable to update schedule.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {hasVotingEnabled(event) && (
          <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-6 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
                  Voting schedule
                </p>
                <p className="mt-2 text-sm leading-6 text-ink/52">
                  Adjust nominations and voting dates after approval.
                </p>
              </div>
              {votingHasStarted && (
                <span className="rounded-full border border-[#f3e3c5] bg-[#fbf6e9] px-3 py-1 text-[0.68rem] font-semibold text-[#8a6512]">
                  Nominations locked
                </span>
              )}
            </div>

            {votingHasStarted && (
              <p className="mt-4 rounded-xl border border-[#f3e3c5] bg-[#fbf6e9] px-4 py-3 text-sm text-[#8a6512]">
                Voting has started, so nominations cannot be reopened and voting start cannot be moved.
              </p>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <ScheduleDateField
                label="Nominations start"
                value={nominationStartAt}
                onChange={setNominationStartAt}
                disabled={votingHasStarted || saving}
                onNow={() => setNominationStartAt(now())}
              />
              <ScheduleDateField
                label="Nominations end"
                value={nominationEndAt}
                onChange={setNominationEndAt}
                disabled={votingHasStarted || saving}
                onNow={() => setNominationEndAt(now())}
              />
              <ScheduleDateField
                label="Voting starts"
                value={votingStartAt}
                onChange={setVotingStartAt}
                disabled={votingHasStarted || saving}
                onNow={() => setVotingStartAt(now())}
              />
              <ScheduleDateField
                label="Voting ends"
                value={votingEndAt}
                onChange={setVotingEndAt}
                disabled={saving}
                onNow={() => setVotingEndAt(now())}
              />
            </div>
          </div>
        )}

        {hasTicketingEnabled(event) && (
          <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-6 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
              Ticketing and venue
            </p>
            <p className="mt-2 text-sm leading-6 text-ink/52">
              Control sales dates, event time, and the venue visitors see.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <ScheduleDateField
                label="Ticket sales start"
                value={ticketSalesStartAt}
                onChange={setTicketSalesStartAt}
                disabled={saving}
                onNow={() => setTicketSalesStartAt(now())}
              />
              <ScheduleDateField
                label="Ticket sales end"
                value={ticketSalesEndAt}
                onChange={setTicketSalesEndAt}
                disabled={saving}
                onNow={() => setTicketSalesEndAt(now())}
              />
              <ScheduleDateField
                label="Event starts"
                value={eventStartAt}
                onChange={setEventStartAt}
                disabled={saving}
                onNow={() => setEventStartAt(now())}
              />
              <ScheduleDateField
                label="Event ends"
                value={eventEndAt}
                onChange={setEventEndAt}
                disabled={saving}
                onNow={() => setEventEndAt(now())}
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-ink/52">Venue name</span>
                <input
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  disabled={saving}
                  className="mt-1.5 h-11 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm text-ink outline-none transition focus:border-primary/42 focus:ring-2 focus:ring-primary/10 disabled:bg-ink/5 disabled:text-ink/40"
                  placeholder="Accra International Conference Centre"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink/52">Venue address</span>
                <input
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  disabled={saving}
                  className="mt-1.5 h-11 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm text-ink outline-none transition focus:border-primary/42 focus:ring-2 focus:ring-primary/10 disabled:bg-ink/5 disabled:text-ink/40"
                  placeholder="Osu, Accra"
                />
              </label>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-accent/14 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-xl border border-[#cfe7da] bg-[#eef9f2] px-4 py-3 text-sm font-medium text-[#1b6f4b]">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="button-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving schedule..." : "Save schedule"}
        </button>
      </div>

      <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-6 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.14)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
          Current state
        </p>
        <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
          {formatEventStatus(event.status)}
        </p>
        <dl className="mt-5 space-y-3 text-sm">
          {hasVotingEnabled(event) && (
            <>
              <ScheduleDatum label="Nominations" value={`${formatDateTime(event.nominationStartAt)} to ${formatDateTime(event.nominationEndAt)}`} />
              <ScheduleDatum label="Voting" value={`${formatDateTime(event.votingStartAt)} to ${formatDateTime(event.votingEndAt)}`} />
            </>
          )}
          {hasTicketingEnabled(event) && (
            <>
              <ScheduleDatum label="Ticket sales" value={`${formatDateTime(event.ticketSalesStartAt)} to ${formatDateTime(event.ticketSalesEndAt)}`} />
              <ScheduleDatum label="Event time" value={`${formatDateTime(event.eventStartAt)} to ${formatDateTime(event.eventEndAt)}`} />
              <ScheduleDatum label="Venue" value={event.venueName || "Not set"} />
            </>
          )}
        </dl>
      </div>
    </div>
  );
}

function ScheduleDateField({
  label,
  value,
  onChange,
  disabled,
  onNow,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onNow: () => void;
}) {
  const quickActions = [
    { label: "+1 hr", ms: 60 * 60 * 1000 },
    { label: "+1 day", ms: 24 * 60 * 60 * 1000 },
    { label: "+7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  ];

  return (
    <label className="block rounded-2xl border border-primary/10 bg-[#f7f9fc] p-4">
      <span className="text-xs font-semibold text-ink/52">{label}</span>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-2 h-11 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm text-ink outline-none transition focus:border-primary/42 focus:ring-2 focus:ring-primary/10 disabled:bg-ink/5 disabled:text-ink/40"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onNow}
          disabled={disabled}
          className="rounded-full border border-primary/16 bg-white px-3 py-1 text-[0.68rem] font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Now
        </button>
        {quickActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onChange(addToDateTimeLocal(value, action.ms))}
            disabled={disabled}
            className="rounded-full border border-primary/16 bg-white px-3 py-1 text-[0.68rem] font-semibold text-ink/60 transition hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {action.label}
          </button>
        ))}
      </div>
    </label>
  );
}

function ScheduleDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#edf0f6] bg-[#f7f9fc] p-3">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink/38">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold leading-5 text-ink">{value}</dd>
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
  const [togglingPublicLeaderboard, setTogglingPublicLeaderboard] = useState(false);

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

  async function handleTogglePublicLeaderboard() {
    if (!event || togglingPublicLeaderboard) return;
    setTogglingPublicLeaderboard(true);
    try {
      const updated = await updateEventVisibility(eventId, {
        publicCanViewLeaderboard: !event.publicCanViewLeaderboard,
      });
      setEvent(updated);
    } finally {
      setTogglingPublicLeaderboard(false);
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
    return (
      <AppLoadingState
        label="Loading event manager"
        detail="Opening event settings, nominations, contestants, and payments."
      />
    );
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
    { key: "schedule", label: "Schedule" },
    ...(hasVotingEnabled(event)
      ? [
          { key: "nominations" as const, label: "Nominations" },
          { key: "contestants" as const, label: "Contestants" },
          { key: "votes" as const, label: "Votes" },
          { key: "leaderboard" as const, label: "Leaderboard" },
        ]
      : []),
    ...(hasTicketingEnabled(event)
      ? [{ key: "tickets" as const, label: "Tickets" }]
      : []),
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
          {
            label: "Mode",
            value: getEventModeLabel(event),
          },
          {
            label: hasTicketingEnabled(event) ? "Event date" : "Voting starts",
            value: formatDate(hasTicketingEnabled(event) ? event.eventStartAt : event.votingStartAt),
          },
          {
            label: hasTicketingEnabled(event) ? "Sales open" : "Nominations open",
            value: formatDate(hasTicketingEnabled(event) ? event.ticketSalesStartAt : event.nominationStartAt),
          },
          {
            label: hasVotingEnabled(event) ? "Categories" : "Sales close",
            value: hasVotingEnabled(event) ? String(event.categories.length) : formatDate(event.ticketSalesEndAt),
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
      <div className="mt-8 flex gap-0 overflow-x-auto border-b border-primary/10">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-5 py-3 text-sm font-semibold transition ${
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
            onOpenTickets={() => setActiveTab("tickets")}
            onToggleOwnVotes={handleToggleOwnVotes}
            onToggleLeaderboard={handleToggleLeaderboard}
            onTogglePublicLeaderboard={handleTogglePublicLeaderboard}
            togglingOwnVotes={togglingOwnVotes}
            togglingLeaderboard={togglingLeaderboard}
            togglingPublicLeaderboard={togglingPublicLeaderboard}
          />
        )}
        {activeTab === "schedule" && (
          <ScheduleTab event={event} onUpdated={setEvent} />
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
        {activeTab === "votes" && <VotesTab eventId={event.id} />}
        {activeTab === "leaderboard" && (
          <LeaderboardTab eventId={event.id} />
        )}
        {activeTab === "tickets" && <TicketTypesTab eventId={event.id} />}
      </div>
    </div>
  );
}
