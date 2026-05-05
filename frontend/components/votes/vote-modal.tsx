"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { ApiClientError } from "@/lib/api/client";
import { castVote } from "@/lib/api/votes";
import {
  ContestantResponse,
  EventCategoryResponse,
  EventResponse,
} from "@/lib/api/types";

const inputClass =
  "mt-0 w-full rounded-xl border border-[#d6deeb] bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition";

const QUANTITY_PRESETS = [1, 5, 10, 20, 50];

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

type Step = "form" | "submitting" | "success" | "error";

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
  const [step, setStep] = useState<Step>("form");
  const [errorMessage, setErrorMessage] = useState<string>("");

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
      quantity >= 1 &&
      Number.isFinite(quantity)
    );
  }, [voterName, voterEmail, quantity]);

  async function onSubmit(event_: React.FormEvent) {
    event_.preventDefault();
    if (!canSubmit) return;

    setStep("submitting");
    setErrorMessage("");

    try {
      const result = await castVote(event.id, {
        contestantId: contestant.id,
        quantity: isFree ? 1 : quantity,
        voterName: voterName.trim(),
        voterEmail: voterEmail.trim(),
        callbackOrigin: window.location.origin,
      });

      if (result.type === "payment" && result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

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
          {step === "success" ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef9f2]">
                <svg className="h-8 w-8 text-[#1b6f4b]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <p className="font-display text-xl font-semibold tracking-tight text-ink">
                  Vote{!isFree && quantity > 1 ? "s" : ""} cast!
                </p>
                <p className="mt-1 text-sm text-ink/55">
                  {isFree ? 1 : quantity} vote{!isFree && quantity > 1 ? "s" : ""} for {contestant.name}.
                </p>
                {!isFree && (
                  <p className="mt-1 text-sm text-ink/55">
                    A receipt is on its way to {voterEmail}.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="button-primary mt-2"
              >
                Done
              </button>
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

              {step === "error" && (
                <div className="rounded-xl border border-[#f0cfd3] bg-[#fff2f4] px-4 py-3 text-sm text-[#b40f17]">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || step === "submitting"}
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
