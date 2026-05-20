"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api/client";
import {
  confirmPhoneVerification,
  startPhoneVerification,
} from "@/lib/api/events";
import { castVote, verifyVote } from "@/lib/api/votes";
import {
  ContestantResponse,
  EventCategoryResponse,
  EventResponse,
  VerifyVoteResponse,
} from "@/lib/api/types";

const inputClass =
  "mt-0 w-full rounded-xl border border-[#d6deeb] bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition";

const QUANTITY_PRESETS = [1, 5, 10, 20, 50];
const usePaystack = process.env.NEXT_PUBLIC_USE_PAYSTACK === "true";
type MomoProvider = "mtn" | "vodafone" | "airteltigo";
const momoProviders: Array<{ value: MomoProvider; label: string }> = [
  { value: "mtn", label: "MTN" },
  { value: "vodafone", label: "Vodafone" },
  { value: "airteltigo", label: "AirtelTigo" },
];

function formatPrice(minor: number, currency: string): string {
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

type Props = {
  event: EventResponse;
  contestant: ContestantResponse;
  category: EventCategoryResponse;
  onClose: () => void;
  onVoteSuccess?: () => void;
};

type Step =
  | "form"
  | "submitting"
  | "payment_pending"
  | "payment_failed"
  | "success"
  | "error";

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
            : "border-[#d6deeb] bg-white text-ink/45"
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

export function VoteModal({
  event,
  contestant,
  category,
  onClose,
  onVoteSuccess,
}: Props) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState<number>(1);
  const [customQuantity, setCustomQuantity] = useState<string>("");
  const [voterName, setVoterName] = useState<string>(user?.fullName ?? "");
  const [voterEmail, setVoterEmail] = useState<string>(user?.email ?? "");
  const [voterPhone, setVoterPhone] = useState<string>("");
  const [momoProvider, setMomoProvider] = useState<MomoProvider>("mtn");
  const [otpCode, setOtpCode] = useState<string>("");
  const [verificationChallenge, setVerificationChallenge] = useState<{
    challengeId: string;
    maskedPhone: string;
  } | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [notice, setNotice] = useState<string>("");
  const [step, setStep] = useState<Step>("form");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const [paymentCheckKey, setPaymentCheckKey] = useState(0);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [confirmedVote, setConfirmedVote] = useState<VerifyVoteResponse | null>(null);

  const isFree = category.votePriceMinor === 0;
  const totalMinor = quantity * category.votePriceMinor;

  // Lock body scroll while open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSubmit = useMemo(() => {
    return (
      voterName.trim().length > 0 &&
      voterEmail.trim().length > 0 &&
      (isFree || usePaystack || (voterPhone.trim().length > 0 && momoProvider)) &&
      quantity >= 1 &&
      Number.isFinite(quantity)
    );
  }, [isFree, voterName, voterEmail, voterPhone, momoProvider, quantity]);
  const paymentRequestCompleted = step === "success";

  function resetPhoneVerification(nextPhone: string) {
    setVoterPhone(nextPhone);
    setOtpCode("");
    setVerificationChallenge(null);
    setVerifiedPhone(null);
    setNotice("");
    setPaymentReference(null);
    setPaymentAttempts(0);
    setConfirmedVote(null);
  }

  async function runPaymentStatusCheck(
    reference: string,
    signal: { cancelled: boolean },
  ): Promise<"confirmed" | "failed" | "pending" | "error"> {
    try {
      const result = await verifyVote(event.id, reference);
      if (signal.cancelled) return "error";
      if (result.status === "CONFIRMED") {
        setConfirmedVote(result);
        setStep("success");
        onVoteSuccess?.();
        return "confirmed";
      }
      if (result.status === "FAILED") {
        setErrorMessage("Payment was not confirmed, so no vote was recorded.");
        setStep("payment_failed");
        return "failed";
      }
      return "pending";
    } catch (error) {
      if (signal.cancelled) return "error";
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "We couldn't confirm this payment yet.",
      );
      return "error";
    }
  }

  useEffect(() => {
    if (step !== "payment_pending" || !paymentReference || usePaystack) return;

    const activeReference = paymentReference;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const maxAttempts = 8;

    async function poll() {
      attempts += 1;
      setPaymentAttempts(attempts);
      setIsCheckingPayment(true);

      const outcome = await runPaymentStatusCheck(activeReference, { cancelled });
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
  }, [event.id, onVoteSuccess, paymentCheckKey, paymentReference, step, usePaystack]);

  async function handleCheckAgain() {
    if (!paymentReference) return;
    setErrorMessage("");
    setNotice("");
    setStep("payment_pending");
    setPaymentCheckKey((current) => current + 1);
  }

  async function onSubmit(event_: React.FormEvent) {
    event_.preventDefault();
    if (!canSubmit) return;

    setStep("submitting");
    setErrorMessage("");
    setNotice("");

    try {
      let verifiedPhoneForPayment = verifiedPhone;
      if (!isFree && !usePaystack) {
        if (!verificationChallenge) {
          const challenge = await startPhoneVerification({
            phone: voterPhone.trim(),
            purpose: "JUNIPAY_COLLECTION",
          });
          setVerificationChallenge({
            challengeId: challenge.challengeId,
            maskedPhone: challenge.maskedPhone,
          });
          setNotice(`Verification code sent to ${challenge.maskedPhone}.`);
          setStep("form");
          return;
        }

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
      }

      const result = await castVote(event.id, {
        contestantId: contestant.id,
        quantity: isFree ? 1 : quantity,
        voterName: voterName.trim(),
        voterEmail: voterEmail.trim(),
        voterPhone: !isFree && !usePaystack ? verifiedPhoneForPayment ?? voterPhone.trim() : undefined,
        momoProvider: !isFree && !usePaystack ? momoProvider : undefined,
        phoneVerificationChallengeId:
          !isFree && !usePaystack ? verificationChallenge?.challengeId : undefined,
        callbackOrigin: window.location.origin,
      });

      if (result.type === "payment" && result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      if (result.type === "payment" && !result.paymentUrl) {
        setPaymentReference(result.reference);
        setConfirmedVote(null);
        setPaymentAttempts(0);
        setNotice("");
        setPaymentCheckKey((current) => current + 1);
        setStep("payment_pending");
        return;
      }
      setConfirmedVote(null);
      setStep("success");
      onVoteSuccess?.();
    } catch (err) {
      setStep("error");
      if (err instanceof ApiClientError) {
        if (err.status === 429) {
          setErrorMessage(
            "You've already voted for this contestant recently. Please try again in a little while.",
          );
        } else if (err.status === 501) {
          setErrorMessage(
            "Paid voting is not available yet. Free categories work normally.",
          );
        } else if (err.status === 409) {
          setErrorMessage(
            "Voting isn't currently live for this event.",
          );
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setIsVerifyingPhone(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vote-modal-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-[0_40px_100px_-30px_rgba(7,17,31,0.45)]">
        {/* Header with contestant */}
        <div className="relative flex items-center gap-4 border-b border-ink/8 bg-[#f7f9fc] px-6 py-5">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#e4ecf8]">
            {contestant.imageUrl ? (
              <Image
                src={contestant.imageUrl}
                alt={contestant.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-base font-semibold text-primary/60">
                {getInitials(contestant.name)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              id="vote-modal-title"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              {contestant.name}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[0.65rem] font-semibold text-white">
                {contestant.code}
              </span>
              <span className="truncate text-xs text-ink/50">
                {category.name}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink/40 transition hover:bg-ink/8 hover:text-ink"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {step === "success" || step === "payment_pending" || step === "payment_failed" ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full ${
                  step === "success"
                    ? "bg-[#eef9f2]"
                    : step === "payment_failed"
                      ? "bg-[#fff2f4]"
                      : "bg-primary/10"
                }`}
              >
                <svg
                  className={`h-8 w-8 ${
                    step === "success"
                      ? "text-[#1b6f4b]"
                      : step === "payment_failed"
                        ? "text-[#b40f17]"
                        : "text-primary"
                  }`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  {step === "success" ? (
                    <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  ) : step === "payment_failed" ? (
                    <path d="M9.75 9.75 14.25 14.25M14.25 9.75 9.75 14.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  ) : (
                    <path d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2Zm1 5h-2v6l5 3 .9-1.7-3.9-2.3V7Z" />
                  )}
                </svg>
              </div>
              <div>
                <p className="font-display text-xl font-semibold tracking-tight text-ink">
                  {step === "success"
                    ? "Voting confirmed"
                    : step === "payment_failed"
                      ? "Payment not confirmed"
                      : isCheckingPayment
                        ? "Checking your payment"
                        : "Waiting for confirmation"}
                </p>
                <p className="mt-1 text-sm text-ink/55">
                  {step === "success"
                    ? `${confirmedVote?.quantity ?? (isFree ? 1 : quantity)} vote${(confirmedVote?.quantity ?? (isFree ? 1 : quantity)) > 1 ? "s" : ""} for ${contestant.name} have been recorded successfully.`
                    : step === "payment_failed"
                      ? "The payment did not complete successfully, so your vote was not recorded."
                      : isCheckingPayment
                        ? "Approve the mobile money prompt on your phone. We are checking with JuniPay and will confirm the vote here."
                        : "We have sent the payment prompt, but the vote is not confirmed yet."}
                </p>
                {step === "success" && !isFree && (
                  <p className="mt-1 text-sm text-ink/55">
                    A receipt is on its way to {voterEmail}.
                  </p>
                )}
              </div>

              <div className="w-full rounded-2xl border border-ink/10 bg-[#f7f9fc] p-4 text-left">
                <div className="flex flex-wrap gap-2">
                  <StatusPill label="Prompt sent" state={paymentReference ? "done" : "idle"} />
                  <StatusPill
                    label="Payment verified"
                    state={
                      step === "success"
                        ? "done"
                        : isCheckingPayment
                          ? "active"
                          : step === "payment_failed"
                            ? "idle"
                            : "idle"
                    }
                  />
                  <StatusPill
                    label="Vote confirmed"
                    state={step === "success" ? "done" : "idle"}
                  />
                </div>

                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink/55">Contestant</dt>
                    <dd className="font-semibold text-ink">{contestant.name}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink/55">Category</dt>
                    <dd className="font-semibold text-ink">{category.name}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink/55">Votes</dt>
                    <dd className="font-semibold text-ink">
                      {confirmedVote?.quantity ?? (isFree ? 1 : quantity)}
                    </dd>
                  </div>
                  {!isFree && (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ink/55">Amount</dt>
                      <dd className="font-semibold text-ink">
                        {formatPrice(confirmedVote?.amountMinor ?? totalMinor, category.currency)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {step === "payment_pending" && !isCheckingPayment && (
                <p className="max-w-sm text-sm leading-6 text-ink/55">
                  Approval may still be pending on the wallet. If you have already approved it, check again.
                </p>
              )}

              {step === "payment_pending" && errorMessage && (
                <div className="w-full rounded-xl border border-[#f0cfd3] bg-[#fff2f4] px-4 py-3 text-sm text-[#b40f17]">
                  {errorMessage}
                </div>
              )}

              <div className="mt-2 flex w-full flex-col gap-3">
                {step === "success" ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="button-primary w-full"
                  >
                    Close
                  </button>
                ) : step === "payment_failed" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("form");
                        setPaymentReference(null);
                        setConfirmedVote(null);
                      }}
                      className="button-primary w-full"
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="button-secondary w-full"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleCheckAgain()}
                      disabled={isCheckingPayment}
                      className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCheckingPayment
                        ? `Checking${paymentAttempts > 0 ? ` (${paymentAttempts})` : ""}...`
                        : "Check status again"}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="button-secondary w-full"
                    >
                      Close for now
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-5">
              {/* Quantity (paid only — free votes are capped at 1) */}
              {isFree ? (
                <div className="rounded-xl bg-[#eef9f2] px-4 py-3 text-sm text-[#1b6f4b]">
                  This category is free to vote in. You can cast 1 vote per
                  contestant per hour.
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
                    Number of votes
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {QUANTITY_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setQuantity(preset);
                          setCustomQuantity("");
                        }}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                          customQuantity === "" && quantity === preset
                            ? "bg-primary text-white shadow-[0_4px_14px_-4px_rgba(15,76,219,0.5)]"
                            : "border border-[#d6deeb] bg-white text-ink/70 hover:border-primary/40 hover:text-primary"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={customQuantity}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setCustomQuantity(raw);
                        const n = Number.parseInt(raw, 10);
                        setQuantity(Number.isFinite(n) && n >= 1 ? n : 1);
                      }}
                      placeholder="Custom"
                      aria-label="Custom number of votes"
                      className="w-28 rounded-full border border-[#d6deeb] bg-white px-3 py-1.5 text-center text-sm text-ink outline-none placeholder:text-ink/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                  <p className="mt-3 rounded-xl bg-[#f7f9fc] px-4 py-3 text-sm text-ink/70">
                    {quantity} × {formatPrice(category.votePriceMinor, category.currency)} ={" "}
                    <span className="font-semibold text-ink">
                      {formatPrice(totalMinor, category.currency)}
                    </span>
                  </p>
                </div>
              )}

              {/* Voter details */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
                  Your name
                </label>
                <input
                  type="text"
                  required
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                  className={inputClass}
                  placeholder="Full name"
                  disabled={step === "submitting"}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={voterEmail}
                  onChange={(e) => setVoterEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                  disabled={step === "submitting"}
                />
                <p className="mt-1.5 text-xs text-ink/40">
                  We&apos;ll send a vote confirmation here.
                </p>
              </div>

              {!isFree && !usePaystack && (
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
                            : verificationChallenge
                              ? "idle"
                              : "idle"
                      }
                    />
                    <StatusPill
                      label="Payment request"
                      state={
                        paymentRequestCompleted
                          ? "done"
                          : step === "submitting" && Boolean(verifiedPhone)
                            ? "active"
                            : "idle"
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
                      Mobile money phone
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={voterPhone}
                      onChange={(e) => resetPhoneVerification(e.target.value)}
                      className={inputClass}
                      placeholder="0241234567"
                      disabled={step === "submitting" || Boolean(verifiedPhone)}
                    />
                    <p className="mt-1.5 text-xs text-ink/40">
                      We&apos;ll verify this number before starting JuniPay collection.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
                      Network
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {momoProviders.map((provider) => (
                        <button
                          key={provider.value}
                          type="button"
                          onClick={() => setMomoProvider(provider.value)}
                          disabled={step === "submitting" || Boolean(verifiedPhone)}
                          className={`h-10 rounded-xl border text-xs font-semibold transition ${
                            momoProvider === provider.value
                              ? "border-primary bg-primary text-white"
                              : "border-[#d6deeb] bg-white text-ink/70"
                          }`}
                        >
                          {provider.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {verificationChallenge && !verifiedPhone && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
                        Verification code
                      </label>
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        className={`${inputClass} tracking-[0.24em]`}
                        placeholder="123456"
                        disabled={step === "submitting"}
                      />
                    </div>
                  )}

                  {verifiedPhone && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      Phone number verified. Mobile money checkout is ready.
                    </div>
                  )}
                </>
              )}

              {step === "error" && (
                <div className="rounded-xl border border-[#f0cfd3] bg-[#fff2f4] px-4 py-3 text-sm text-[#b40f17]">
                  {errorMessage}
                </div>
              )}

              {notice && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  !canSubmit ||
                  step === "submitting" ||
                  (!isFree &&
                    !usePaystack &&
                    Boolean(verificationChallenge) &&
                    !verifiedPhone &&
                    otpCode.length !== 6)
                }
                className="button-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {step === "submitting" ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                    </svg>
                    Casting…
                  </span>
                ) : isFree ? (
                  "Cast vote"
                ) : usePaystack ? (
                  `Pay ${formatPrice(totalMinor, category.currency)}`
                ) : !verificationChallenge ? (
                  "Send verification code"
                ) : !verifiedPhone ? (
                  isVerifyingPhone ? "Verifying..." : "Verify and pay"
                ) : (
                  `Pay ${formatPrice(totalMinor, category.currency)}`
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
