"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppLoadingState } from "@/components/app-loading-state";
import { useAuth } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api/client";
import {
  confirmPhoneVerification,
  createTicketOrder,
  getEvent,
  listContestants,
  listTicketTypes,
  startPhoneVerification,
  verifyTicketOrder,
} from "@/lib/api/events";
import {
  ContestantResponse,
  EventCategoryResponse,
  EventStatus,
  EventResponse,
  TicketOrderResponse,
  TicketTypeResponse,
} from "@/lib/api/types";
import {
  momoProviderPhoneMessage,
  phoneMatchesMomoProvider,
} from "@/lib/momo-phone";
import {
  hasTicketingEnabled,
  hasVotingEnabled,
} from "@/lib/event-capabilities";
import { PublicLeaderboard } from "@/components/votes/public-leaderboard";
import { VoteModal } from "@/components/votes/vote-modal";
import { NominationForm, StatusBanner } from "./nomination-form";

const usePaystack = process.env.NEXT_PUBLIC_USE_PAYSTACK === "true";
type MomoProvider = "mtn" | "vodafone" | "airteltigo";
const momoProviders: Array<{ value: MomoProvider; label: string }> = [
  { value: "mtn", label: "MTN" },
  { value: "vodafone", label: "Vodafone" },
  { value: "airteltigo", label: "AirtelTigo" },
];

function StatusPill({
  label,
  state,
}: {
  label: string;
  state: "idle" | "active" | "done";
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        state === "done"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : state === "active"
            ? "border-primary/20 bg-primary/8 text-primary"
            : "border-primary/12 bg-white text-ink/45"
      }`}
    >
      {state === "done" ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 12.75 11.25 15 15 9.75" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-7 9a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z"
          />
        </svg>
      ) : state === "active" ? (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : (
        <span className="h-3.5 w-3.5 rounded-full border border-current/35" />
      )}
      <span>{label}</span>
    </div>
  );
}

function formatDate(date: string | null): string {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(date: string | null): string {
  if (!date) return "Not set";
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function getTicketSalesState(event: EventResponse): {
  isOpen: boolean;
  message: string;
} {
  if (
    ![
      "APPROVED",
      "NOMINATIONS_OPEN",
      "NOMINATIONS_CLOSED",
      "VOTING_SCHEDULED",
      "VOTING_LIVE",
      "VOTING_CLOSED",
    ].includes(event.status)
  ) {
    return {
      isOpen: false,
      message: "Ticket sales will open after this event is approved.",
    };
  }

  const now = Date.now();
  const salesStart = event.ticketSalesStartAt
    ? new Date(event.ticketSalesStartAt).getTime()
    : null;
  const salesEnd = event.ticketSalesEndAt
    ? new Date(event.ticketSalesEndAt).getTime()
    : null;

  if (salesStart && salesStart > now) {
    return {
      isOpen: false,
      message: `Ticket sales open on ${formatDateTime(event.ticketSalesStartAt)}.`,
    };
  }

  if (salesEnd && salesEnd < now) {
    return {
      isOpen: false,
      message: "Ticket sales are closed for this event.",
    };
  }

  return { isOpen: true, message: "Ticket sales are open." };
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

function TicketCheckoutPanel({
  event,
  ticketTypes,
  onOrderPaid,
}: {
  event: EventResponse;
  ticketTypes: TicketTypeResponse[];
  onOrderPaid?: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [momoProvider, setMomoProvider] = useState<MomoProvider>("mtn");
  const [otpCode, setOtpCode] = useState("");
  const [verificationChallenge, setVerificationChallenge] = useState<{
    challengeId: string;
    maskedPhone: string;
    expiresAt: string;
  } | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<
    "details" | "payment_pending" | "success" | "payment_failed"
  >("details");
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<TicketOrderResponse | null>(null);
  const [lastOrder, setLastOrder] = useState<TicketOrderResponse | null>(null);

  const salesState = getTicketSalesState(event);
  const availableTicketTypes = ticketTypes.filter((ticketType) => {
    if (!ticketType.isActive) return false;
    if (ticketType.quantityAvailable === null) return true;
    return ticketType.quantitySold < ticketType.quantityAvailable;
  });

  const selectedItems = useMemo(
    () =>
      availableTicketTypes
        .map((ticketType) => ({
          ticketType,
          quantity: quantities[ticketType.id] ?? 0,
        }))
        .filter((item) => item.quantity > 0),
    [availableTicketTypes, quantities],
  );
  const totalAmountMinor = selectedItems.reduce(
    (sum, item) => sum + item.ticketType.priceMinor * item.quantity,
    0,
  );
  const currency = selectedItems[0]?.ticketType.currency ?? ticketTypes[0]?.currency ?? "GHS";
  const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const phoneSelectionLocked = Boolean(verificationChallenge);

  function setQuantity(ticketType: TicketTypeResponse, nextQuantity: number) {
    const remaining =
      ticketType.quantityAvailable === null
        ? 99
        : Math.max(ticketType.quantityAvailable - ticketType.quantitySold, 0);
    const clamped = Math.max(0, Math.min(nextQuantity, remaining));
    setQuantities((current) => ({ ...current, [ticketType.id]: clamped }));
  }

  function resetPhoneVerification(nextPhone: string) {
    setBuyerPhone(nextPhone);
    setOtpCode("");
    setVerificationChallenge(null);
    setVerifiedPhone(null);
    setNotice(null);
    setPaymentReference(null);
    setPaymentAttempts(0);
    setConfirmedOrder(null);
    setLastOrder(null);
    setCheckoutStep("details");
  }

  async function runTicketPaymentStatusCheck(
    reference: string,
    signal: { cancelled: boolean },
  ): Promise<"confirmed" | "failed" | "pending" | "error"> {
    try {
      const order = await verifyTicketOrder(event.id, reference);
      if (signal.cancelled) return "error";
      setLastOrder(order);

      if (order.status === "PAID") {
        setConfirmedOrder(order);
        setCheckoutStep("success");
        onOrderPaid?.();
        return "confirmed";
      }

      if (order.status === "FAILED" || order.status === "CANCELLED") {
        setError("Payment was not confirmed, so no tickets were issued.");
        setCheckoutStep("payment_failed");
        return "failed";
      }

      return "pending";
    } catch (statusError) {
      if (signal.cancelled) return "error";
      setError(
        statusError instanceof ApiClientError
          ? statusError.message
          : "We couldn't confirm this ticket payment yet.",
      );
      return "error";
    }
  }

  useEffect(() => {
    if (checkoutStep !== "payment_pending" || !paymentReference || usePaystack) return;

    const activeReference = paymentReference;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const maxAttempts = 8;

    async function poll() {
      attempts += 1;
      setPaymentAttempts(attempts);
      setIsCheckingPayment(true);

      const outcome = await runTicketPaymentStatusCheck(activeReference, { cancelled });
      if (cancelled) return;

      if (outcome === "confirmed" || outcome === "failed") {
        setIsCheckingPayment(false);
        return;
      }

      if (outcome === "pending" && attempts < maxAttempts) {
        timeoutId = setTimeout(() => {
          void poll();
        }, 2200);
        return;
      }

      setIsCheckingPayment(false);
    }

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkoutStep, event.id, paymentReference, onOrderPaid]);

  function validateBuyerDetails(): boolean {
    setError(null);
    setNotice(null);

    if (!salesState.isOpen) {
      setError(salesState.message);
      return false;
    }
    if (selectedItems.length === 0) {
      setError("Select at least one ticket.");
      return false;
    }
    if (!buyerName.trim()) {
      setError("Enter your name.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim())) {
      setError("Enter a valid email address.");
      return false;
    }
    if (!usePaystack && !buyerPhone.trim()) {
      setError("Enter the mobile money phone number to verify.");
      return false;
    }
    if (!usePaystack && !phoneMatchesMomoProvider(buyerPhone.trim(), momoProvider)) {
      setError(momoProviderPhoneMessage(momoProvider));
      return false;
    }
    return true;
  }

  async function handleSubmit(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    if (!validateBuyerDetails()) return;
    setIsSubmitting(true);

    try {
      if (usePaystack) {
        const result = await createTicketOrder(event.id, {
          items: selectedItems.map((item) => ({
            ticketTypeId: item.ticketType.id,
            quantity: item.quantity,
          })),
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          buyerPhone: buyerPhone.trim() || undefined,
          callbackOrigin: window.location.origin,
        });
        if (result.paymentUrl) {
          window.location.href = result.paymentUrl;
          return;
        }
        setNotice("Payment request started. Complete the prompt to finish checkout.");
        return;
      }

      if (!verificationChallenge) {
        const challenge = await startPhoneVerification({
          phone: buyerPhone.trim(),
          purpose: "JUNIPAY_COLLECTION",
        });
        setVerificationChallenge({
          challengeId: challenge.challengeId,
          maskedPhone: challenge.maskedPhone,
          expiresAt: challenge.expiresAt,
        });
        setNotice(`Verification code sent to ${challenge.maskedPhone}.`);
        return;
      }

      let verifiedPhoneForPayment = verifiedPhone;
      if (!verifiedPhoneForPayment) {
        setIsVerifyingPhone(true);
        const result = await confirmPhoneVerification({
          challengeId: verificationChallenge.challengeId,
          code: otpCode,
          purpose: "JUNIPAY_COLLECTION",
        });
        verifiedPhoneForPayment = result.phone;
        setVerifiedPhone(result.phone);
        setNotice("Phone verified. Requesting mobile money payment now.");
      }

      const result = await createTicketOrder(event.id, {
        items: selectedItems.map((item) => ({
          ticketTypeId: item.ticketType.id,
          quantity: item.quantity,
        })),
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        buyerPhone: verifiedPhoneForPayment ?? buyerPhone.trim(),
        momoProvider,
        phoneVerificationChallengeId: verificationChallenge.challengeId,
        callbackOrigin: window.location.origin,
      });
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }
      setLastOrder(result.order);
      setPaymentReference(result.reference);
      setPaymentAttempts(0);
      setCheckoutStep("payment_pending");
      setNotice("Payment request sent. Approve the mobile money prompt to complete your ticket purchase.");
    } catch (checkoutError) {
      setError(
        checkoutError instanceof ApiClientError
          ? checkoutError.message
          : usePaystack
            ? "Unable to start checkout. Please try again."
            : "Unable to verify this phone number. Please try again.",
      );
    } finally {
      setIsVerifyingPhone(false);
      setIsSubmitting(false);
    }
  }

  if (checkoutStep === "success" && confirmedOrder) {
    return (
      <TicketPaymentResult
        tone="success"
        title="Tickets confirmed"
        body="Your payment has been confirmed and your tickets have been issued."
        order={confirmedOrder}
        primaryAction={
          <Link href={`/events/${event.id}`} className="button-primary">
            Back to event
          </Link>
        }
      />
    );
  }

  if (checkoutStep === "payment_failed") {
    return (
      <TicketPaymentResult
        tone="error"
        title="Payment did not go through"
        body={error ?? "Your wallet was not charged successfully, so no tickets were issued."}
        order={lastOrder}
        primaryAction={
          <button
            type="button"
            onClick={() => {
              setCheckoutStep("details");
              setError(null);
              setNotice(null);
              setPaymentReference(null);
              setPaymentAttempts(0);
            }}
            className="button-primary"
          >
            Try again
          </button>
        }
      />
    );
  }

  if (checkoutStep === "payment_pending" && paymentReference) {
    return (
      <TicketPaymentResult
        tone="warning"
        title="Payment request sent"
        body={
          isCheckingPayment
            ? "Approve the mobile money prompt on your phone. We are checking the payment status."
            : "We have not received confirmation yet. Approve the prompt, then refresh the status."
        }
        order={lastOrder}
        reference={paymentReference}
        meta={`Status checks: ${paymentAttempts}`}
        primaryAction={
          <button
            type="button"
            onClick={() => {
              setCheckoutStep("details");
              setPaymentReference(null);
              setPaymentAttempts(0);
              setNotice(null);
            }}
            className="button-secondary"
          >
            Edit details
          </button>
        }
      />
    );
  }

  return (
    <form
      onSubmit={(eventSubmit) => void handleSubmit(eventSubmit)}
      className="rounded-[1.5rem] border border-primary/10 bg-white/90 p-7 shadow-[0_16px_48px_-24px_rgba(7,17,31,0.18)]"
    >
      <p className="font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
        Buy tickets
      </p>
      <p className="mt-1.5 text-sm leading-6 text-ink/54">
        Select your ticket types. The total is calculated before you pay.
      </p>

      <div className="mt-5 rounded-xl border border-primary/10 bg-[#f7f9fc] px-4 py-3 text-sm font-medium text-ink/62">
        {salesState.message}
      </div>

      <div className="mt-5 space-y-3">
        {availableTicketTypes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-primary/16 bg-[#f7f9fc] p-4 text-sm text-ink/52">
            No tickets are currently available.
          </p>
        ) : (
          availableTicketTypes.map((ticketType) => {
            const quantity = quantities[ticketType.id] ?? 0;
            const remaining =
              ticketType.quantityAvailable === null
                ? null
                : Math.max(ticketType.quantityAvailable - ticketType.quantitySold, 0);
            return (
              <div
                key={ticketType.id}
                className="rounded-2xl border border-primary/10 bg-[#fbfcff] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{ticketType.name}</p>
                    <p className="mt-1 text-xs text-ink/48">
                      {formatCurrency(ticketType.priceMinor, ticketType.currency)}
                      {remaining === null ? " · unlimited" : ` · ${remaining} left`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(ticketType, quantity - 1)}
                      disabled={!salesState.isOpen || quantity === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/16 text-sm font-bold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Reduce ${ticketType.name}`}
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-ink">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(ticketType, quantity + 1)}
                      disabled={!salesState.isOpen || remaining === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-ink/12 disabled:text-ink/35"
                      aria-label={`Add ${ticketType.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-5 grid gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-ink/60">Full name</span>
          <input
            className="mt-2 h-11 w-full rounded-xl border border-primary/12 bg-[#fbfcff] px-3 text-sm outline-none transition focus:border-primary/40"
            value={buyerName}
            onChange={(inputEvent) => setBuyerName(inputEvent.target.value)}
            disabled={!salesState.isOpen || isSubmitting}
            placeholder="Your name"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink/60">Email</span>
          <input
            type="email"
            className="mt-2 h-11 w-full rounded-xl border border-primary/12 bg-[#fbfcff] px-3 text-sm outline-none transition focus:border-primary/40"
            value={buyerEmail}
            onChange={(inputEvent) => setBuyerEmail(inputEvent.target.value)}
            disabled={!salesState.isOpen || isSubmitting}
            placeholder="you@example.com"
          />
        </label>
        {!usePaystack ? (
          <>
            <div className="flex flex-wrap gap-2">
              <StatusPill
                label="Code sent"
                state={verificationChallenge ? "done" : "idle"}
              />
              <StatusPill
                label="Phone verified"
                state={
                  verifiedPhone
                    ? "done"
                    : isVerifyingPhone
                      ? "active"
                      : "idle"
                }
              />
              <StatusPill
                label="Payment request"
                state={
                  notice?.includes("Payment request sent")
                    ? "done"
                    : isSubmitting && Boolean(verifiedPhone)
                      ? "active"
                      : "idle"
                }
              />
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-ink/60">Phone</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="mt-2 h-11 w-full rounded-xl border border-primary/12 bg-[#fbfcff] px-3 text-sm outline-none transition focus:border-primary/40"
                value={buyerPhone}
                onChange={(inputEvent) => resetPhoneVerification(inputEvent.target.value)}
                disabled={!salesState.isOpen || isSubmitting || phoneSelectionLocked}
                placeholder="0241234567"
              />
            </label>
            {verificationChallenge && !verifiedPhone ? (
              <label className="block">
                <span className="text-xs font-semibold text-ink/60">Verification code</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="mt-2 h-11 w-full rounded-xl border border-primary/12 bg-[#fbfcff] px-3 text-sm tracking-[0.24em] outline-none transition focus:border-primary/40"
                  value={otpCode}
                  onChange={(inputEvent) => setOtpCode(inputEvent.target.value.replace(/\D/g, ""))}
                  disabled={!salesState.isOpen || isSubmitting}
                  placeholder="123456"
                />
              </label>
            ) : null}
            {verifiedPhone ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Phone number verified. Mobile money checkout is ready.
              </div>
            ) : null}
            <div>
              <span className="text-xs font-semibold text-ink/60">Network</span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {momoProviders.map((provider) => (
                  <button
                    key={provider.value}
                    type="button"
                    onClick={() => setMomoProvider(provider.value)}
                    disabled={!salesState.isOpen || isSubmitting || phoneSelectionLocked}
                    className={`h-10 rounded-xl border text-xs font-semibold transition ${
                      momoProvider === provider.value
                        ? "border-primary bg-primary text-white"
                        : "border-primary/12 bg-[#fbfcff] text-ink/70"
                    }`}
                  >
                    {provider.label}
                  </button>
                ))}
              </div>
            </div>
            {verificationChallenge ? (
              <p className="text-xs text-ink/45">
                Phone number and network are locked until this verification is completed.
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-5 rounded-2xl bg-[#07111f] p-4 text-white">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-white/62">Selected</span>
          <span className="font-semibold">{totalQuantity} ticket{totalQuantity === 1 ? "" : "s"}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm text-white/62">Total</span>
          <span className="font-display text-2xl font-semibold">
            {formatCurrency(totalAmountMinor, currency)}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-accent/16 bg-accent/5 px-3 py-2 text-sm font-medium text-accent">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={
          !salesState.isOpen ||
          isSubmitting ||
          selectedItems.length === 0 ||
          (!usePaystack && Boolean(verificationChallenge) && !verifiedPhone && otpCode.length !== 6)
        }
        className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-ink/12 disabled:text-ink/40"
      >
        {isSubmitting
          ? usePaystack ? "Opening checkout..." : "Checking..."
          : usePaystack
            ? "Pay with Paystack"
            : !verificationChallenge
              ? "Send verification code"
              : !verifiedPhone
                ? isVerifyingPhone ? "Verifying..." : "Verify and pay"
                : "Pay with JuniPay"}
      </button>
    </form>
  );
}

function TicketPaymentResult({
  tone,
  title,
  body,
  order,
  reference,
  meta,
  primaryAction,
}: {
  tone: "success" | "error" | "warning";
  title: string;
  body: string;
  order: TicketOrderResponse | null;
  reference?: string;
  meta?: string;
  primaryAction: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "error"
        ? "border-accent/20 bg-accent/5 text-accent"
        : "border-amber-200 bg-amber-50 text-amber-800";
  const iconClass =
    tone === "success"
      ? "bg-emerald-600"
      : tone === "error"
        ? "bg-accent"
        : "bg-amber-500";

  return (
    <section className="rounded-[1.5rem] border border-primary/10 bg-white/90 p-7 shadow-[0_16px_48px_-24px_rgba(7,17,31,0.18)]">
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClass}`}>
        <span className={`h-2 w-2 rounded-full ${iconClass}`} />
        <span>{tone === "success" ? "Confirmed" : tone === "error" ? "Failed" : "Processing"}</span>
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink/60">{body}</p>
      {meta ? <p className="mt-2 text-xs font-semibold text-ink/45">{meta}</p> : null}

      <div className="mt-6">
        {order ? (
          <TicketOrderReceipt order={order} />
        ) : reference ? (
          <div className="rounded-2xl border border-ink/10 bg-[#f7f9fc] px-4 py-3 text-sm">
            <p className="text-ink/55">Reference</p>
            <p className="mt-1 break-all font-mono text-xs leading-5 text-ink/70">
              {reference}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {primaryAction}
        {tone === "warning" ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="button-primary"
          >
            Refresh status
          </button>
        ) : null}
      </div>
    </section>
  );
}

function TicketOrderReceipt({ order }: { order: TicketOrderResponse }) {
  const ticketCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <dl className="w-full divide-y divide-ink/8 rounded-2xl border border-ink/10 bg-[#f7f9fc] text-left">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <dt className="text-ink/55">Tickets</dt>
        <dd className="font-semibold text-ink">{ticketCount}</dd>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <dt className="text-ink/55">Amount</dt>
        <dd className="font-semibold text-ink">
          {formatCurrency(order.totalAmountMinor, order.currency)}
        </dd>
      </div>
      {order.items.map((item) => (
        <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
          <dt className="text-ink/55">{item.ticketTypeName ?? "Ticket"}</dt>
          <dd className="text-right font-semibold text-ink">
            {item.quantity} x {formatCurrency(item.unitPriceMinor, order.currency)}
          </dd>
        </div>
      ))}
      {order.issuedTickets.length > 0 ? (
        <div className="grid gap-2 px-4 py-3 text-sm">
          <dt className="text-ink/55">Ticket codes</dt>
          <dd className="flex flex-wrap gap-2">
            {order.issuedTickets.map((ticket) => (
              <span
                key={ticket.id}
                className="rounded-full bg-white px-3 py-1 font-mono text-xs font-semibold text-ink ring-1 ring-ink/10"
              >
                {ticket.code}
              </span>
            ))}
          </dd>
        </div>
      ) : null}
      {order.payment?.reference ? (
        <div className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[6rem_1fr] sm:items-start">
          <dt className="text-ink/55">Reference</dt>
          <dd className="break-all font-mono text-xs leading-5 text-ink/70 sm:text-right">
            {order.payment.reference}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function PublicEventView({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [contestants, setContestants] = useState<ContestantResponse[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [votingContestant, setVotingContestant] =
    useState<ContestantResponse | null>(null);
  const [leaderboardVersion, setLeaderboardVersion] = useState<number>(0);
  const [ticketInventoryVersion, setTicketInventoryVersion] = useState<number>(0);
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getEvent(eventId);
        const [contestantList, ticketTypeList] =
          await Promise.all([
            hasVotingEnabled(result) ? listContestants(eventId) : Promise.resolve([]),
            hasTicketingEnabled(result) ? listTicketTypes(eventId) : Promise.resolve([]),
          ]);
        if (!cancelled) {
          setEvent(result);
          setContestants(contestantList);
          setTicketTypes(ticketTypeList);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : "We could not open this event page right now.",
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
  }, [eventId, ticketInventoryVersion]);

  if (isLoading) {
    return (
      <AppLoadingState
        label="Loading event"
        detail="Fetching contestants, categories, and voting details."
      />
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
  const supportsVoting = hasVotingEnabled(event);
  const supportsTicketing = hasTicketingEnabled(event);
  const nominationsOpen = event.status === "NOMINATIONS_OPEN";
  const votingLive = supportsVoting && event.status === "VOTING_LIVE";

  const showLeaderboard =
    event.publicCanViewLeaderboard &&
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
  // For VOTING_LIVE we use a slim banner so contestants are visible above the fold.
  // For other states we keep a more substantial hero.
  const heroHeight = votingLive
    ? "h-32 sm:h-40 lg:h-44"
    : "h-44 sm:h-56 lg:h-64";

  const Hero = (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-ink shadow-[0_24px_60px_-40px_rgba(7,17,31,0.4)]">
      <div className={`relative w-full ${heroHeight}`}>
        <Image
          src={event.bannerUrl ?? event.primaryFlyerUrl}
          alt={event.name}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,17,31,0.84)_0%,rgba(7,17,31,0.30)_55%,transparent_100%)]" />
      </div>

      <div className="absolute inset-x-0 bottom-0 px-5 pb-4 sm:px-7 sm:pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-3xl">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-white/55">
              {event.status.replaceAll("_", " ")}
              {votingLive && (
                <span className="ml-2 text-white/85">
                  · {daysUntil(event.votingEndAt)}
                </span>
              )}
            </p>
            <h1 className="mt-1 font-display text-xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-2xl lg:text-3xl">
              {event.name}
            </h1>
          </div>

          {event.bannerUrl && (
            <div className="relative hidden h-12 w-9 shrink-0 overflow-hidden rounded-lg border border-white/20 shadow-lg sm:block">
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

  if (supportsTicketing && !supportsVoting) {
    const hasTicketTypes = ticketTypes.length > 0;

    return (
      <article className="mx-auto max-w-6xl pb-20">
        {Hero}
        {OwnerControls}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-8">
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
                Tickets
              </p>
              {hasTicketTypes ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {ticketTypes.map((ticketType) => {
                    const remaining =
                      ticketType.quantityAvailable === null
                        ? null
                        : Math.max(ticketType.quantityAvailable - ticketType.quantitySold, 0);
                    return (
                      <div
                        key={ticketType.id}
                        className="rounded-[1.25rem] border border-[#edf0f6] bg-[#f7f9fc] p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-display text-xl font-semibold tracking-[-0.03em] text-ink">
                              {ticketType.name}
                            </p>
                            {ticketType.description && (
                              <p className="mt-1 text-sm leading-6 text-ink/50">
                                {ticketType.description}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full border border-primary/16 bg-white px-3 py-1 text-xs font-semibold text-primary">
                            {formatCurrency(ticketType.priceMinor, ticketType.currency)}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink/52">
                          <span>{ticketType.quantitySold} sold</span>
                          <span>/</span>
                          <span>{remaining === null ? "Unlimited" : `${remaining} left`}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-primary/16 bg-[#f7f9fc] p-6 text-sm text-ink/52">
                  Ticket types are being prepared by the organiser.
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <TicketCheckoutPanel
              event={event}
              ticketTypes={ticketTypes}
              onOrderPaid={() => setTicketInventoryVersion((version) => version + 1)}
            />
            <div className="rounded-[1.5rem] border border-primary/10 bg-white/90 p-7 shadow-[0_16px_48px_-24px_rgba(7,17,31,0.18)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
                Venue
              </p>
              <p className="mt-3 font-display text-xl font-semibold tracking-[-0.03em] text-ink">
                {event.venueName || "Venue not set"}
              </p>
              {event.venueAddress && (
                <p className="mt-1 text-sm leading-6 text-ink/54">
                  {event.venueAddress}
                </p>
              )}
              <div className="mt-5 rounded-xl bg-[#f7f9fc] px-4 py-3">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-ink/36">
                  Event date
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {formatDateTime(event.eventStartAt)}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </article>
    );
  }

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
                Contestants have not been published yet
              </p>
              <p className="mt-2 text-sm text-ink/55">
                Voting is open, but the organiser has not published confirmed contestants for this event yet.
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

        {supportsTicketing && (
          <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-7 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
                Tickets
              </p>
              {ticketTypes.length > 0 ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {ticketTypes.map((ticketType) => (
                    <div
                      key={ticketType.id}
                      className="rounded-[1.25rem] border border-[#edf0f6] bg-[#f7f9fc] p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-xl font-semibold tracking-[-0.03em] text-ink">
                            {ticketType.name}
                          </p>
                          {ticketType.description && (
                            <p className="mt-1 text-sm leading-6 text-ink/50">
                              {ticketType.description}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full border border-primary/16 bg-white px-3 py-1 text-xs font-semibold text-primary">
                          {formatCurrency(ticketType.priceMinor, ticketType.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-primary/16 bg-[#f7f9fc] p-6 text-sm text-ink/52">
                  Ticket types are being prepared by the organiser.
                </div>
              )}
            </div>

            <aside className="lg:sticky lg:top-8 lg:self-start">
              <TicketCheckoutPanel event={event} ticketTypes={ticketTypes} />
            </aside>
          </section>
        )}

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
                ...(supportsVoting
                  ? [
                      { label: "Nominations open", value: formatDate(event.nominationStartAt) },
                      { label: "Nominations close", value: formatDate(event.nominationEndAt) },
                      { label: "Voting starts", value: formatDate(event.votingStartAt) },
                      { label: "Voting ends", value: formatDate(event.votingEndAt) },
                    ]
                  : []),
                ...(supportsTicketing
                  ? [
                      { label: "Sales open", value: formatDate(event.ticketSalesStartAt) },
                      { label: "Sales close", value: formatDate(event.ticketSalesEndAt) },
                      { label: "Event starts", value: formatDate(event.eventStartAt) },
                      { label: "Event ends", value: formatDate(event.eventEndAt) },
                    ]
                  : []),
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

          {supportsVoting && (
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
          )}

          {supportsVoting && contestants.length > 0 && (
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

          {supportsVoting && showLeaderboard && (
            <PublicLeaderboard eventId={event.id} refreshKey={leaderboardVersion} />
          )}

          {supportsTicketing && (
            <div className="rounded-[1.5rem] border border-primary/10 bg-white/86 p-7 shadow-[0_8px_28px_-18px_rgba(7,17,31,0.12)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-ink/38">
                Tickets
              </p>
              {ticketTypes.length > 0 ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {ticketTypes.map((ticketType) => (
                    <div
                      key={ticketType.id}
                      className="rounded-[1.25rem] border border-[#edf0f6] bg-[#f7f9fc] p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-xl font-semibold tracking-[-0.03em] text-ink">
                            {ticketType.name}
                          </p>
                          {ticketType.description && (
                            <p className="mt-1 text-sm leading-6 text-ink/50">
                              {ticketType.description}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full border border-primary/16 bg-white px-3 py-1 text-xs font-semibold text-primary">
                          {formatCurrency(ticketType.priceMinor, ticketType.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-primary/16 bg-[#f7f9fc] p-6 text-sm text-ink/52">
                  Ticket types are being prepared by the organiser.
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="space-y-6">
          {supportsTicketing && (
            <TicketCheckoutPanel event={event} ticketTypes={ticketTypes} />
          )}
          {supportsVoting && (
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
          )}
          </div>
        </aside>
      </div>

      {supportsVoting && votingContestant && votingCategory && (
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
