"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiClientError } from "@/lib/api/client";
import { verifyVote } from "@/lib/api/votes";
import { VerifyVoteResponse } from "@/lib/api/types";

type State =
  | { kind: "loading" }
  | { kind: "missing-params" }
  | { kind: "error"; message: string }
  | { kind: "result"; vote: VerifyVoteResponse };

function formatAmount(minor: number, currency: string): string {
  return `${currency} ${(minor / 100).toFixed(2)}`;
}

function Spinner({ size = 36 }: { size?: number }) {
  return (
    <svg
      className="animate-spin text-primary/60"
      style={{ width: size, height: size }}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
    </svg>
  );
}

export function VoteCallbackView() {
  const params = useSearchParams();
  const eventId = params.get("eventId");
  const reference = params.get("reference") ?? params.get("trxref");

  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!eventId || !reference) {
      setState({ kind: "missing-params" });
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 4;

    async function poll() {
      attempts += 1;
      try {
        const result = await verifyVote(eventId!, reference!);
        if (cancelled) return;

        if (result.status === "PENDING_PAYMENT" && attempts < maxAttempts) {
          // Paystack may still be propagating — wait a bit and try again.
          setTimeout(() => {
            if (!cancelled) void poll();
          }, 2000);
          return;
        }

        setState({ kind: "result", vote: result });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiClientError
            ? err.message
            : "Could not verify your payment. Please contact support if you were charged.";
        setState({ kind: "error", message });
      }
    }

    setState({ kind: "loading" });
    void poll();

    return () => { cancelled = true; };
  }, [eventId, reference]);

  if (state.kind === "loading") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 text-center">
        <Spinner size={40} />
        <p className="font-display text-2xl font-semibold tracking-tight text-ink">
          Confirming your payment…
        </p>
        <p className="text-sm text-ink/55">
          This usually takes just a few seconds. Don&apos;t close this page.
        </p>
      </div>
    );
  }

  if (state.kind === "missing-params") {
    return (
      <ResultShell
        tone="error"
        title="Something's missing from the link"
        body="We couldn't read the payment reference from this URL. If you were just charged, please contact the event organiser with your receipt."
      >
        <Link href="/events" className="button-secondary">Browse events</Link>
      </ResultShell>
    );
  }

  if (state.kind === "error") {
    return (
      <ResultShell tone="error" title="Verification failed" body={state.message}>
        <Link href="/events" className="button-secondary">Back to events</Link>
      </ResultShell>
    );
  }

  const { vote } = state;

  if (vote.status === "CONFIRMED") {
    return (
      <ResultShell
        tone="success"
        title="Payment confirmed"
        body="Thanks for voting! Your vote has been recorded."
      >
        <ReceiptTable vote={vote} />
        <Link href={`/events/${vote.eventId}`} className="button-primary">
          Back to event
        </Link>
      </ResultShell>
    );
  }

  if (vote.status === "FAILED") {
    return (
      <ResultShell
        tone="error"
        title="Payment did not go through"
        body="Your card or wallet wasn't charged successfully, so no votes were recorded. Please try again."
      >
        <Link href={`/events/${vote.eventId}`} className="button-primary">
          Try again
        </Link>
      </ResultShell>
    );
  }

  // PENDING_PAYMENT after polling exhausted.
  return (
    <ResultShell
      tone="warning"
      title="Still processing"
      body="Paystack hasn't confirmed your payment yet. This can take a couple of minutes. Refresh this page shortly, or check your email for a confirmation."
    >
      <ReceiptTable vote={vote} />
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="button-primary"
      >
        Refresh
      </button>
    </ResultShell>
  );
}

function ResultShell({
  tone,
  title,
  body,
  children,
}: {
  tone: "success" | "error" | "warning";
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  const ringClass =
    tone === "success"
      ? "ring-[#cfe7da] bg-[#eef9f2]"
      : tone === "error"
      ? "ring-[#f1d6d6] bg-[#fdf3f3]"
      : "ring-[#f3e3c5] bg-[#fbf6e9]";
  const iconColor =
    tone === "success" ? "#1b6f4b" : tone === "error" ? "#a32525" : "#8a6512";

  return (
    <div className="mx-auto max-w-xl py-12">
      <div className="rounded-3xl border border-white/70 bg-white p-8 shadow-[0_12px_40px_-20px_rgba(7,17,31,0.14)]">
        <div className="flex flex-col items-center text-center">
          <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-full ring-4 ${ringClass}`}>
            {tone === "success" ? (
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill={iconColor}>
                <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            ) : tone === "error" ? (
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill={iconColor}>
                <path d="M9.75 9.75 14.25 14.25M14.25 9.75 9.75 14.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            ) : (
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill={iconColor}>
                <path d="M12 9v3.75m0 4.5h.008M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">{body}</p>
          <div className="mt-6 flex flex-col items-center gap-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptTable({ vote }: { vote: VerifyVoteResponse }) {
  return (
    <dl className="w-full divide-y divide-ink/8 rounded-2xl border border-ink/10 bg-[#f7f9fc] text-left">
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <dt className="text-ink/55">Votes</dt>
        <dd className="font-semibold text-ink">{vote.quantity}</dd>
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <dt className="text-ink/55">Amount</dt>
        <dd className="font-semibold text-ink">{formatAmount(vote.amountMinor, vote.currency)}</dd>
      </div>
      {vote.reference && (
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <dt className="text-ink/55">Reference</dt>
          <dd className="font-mono text-xs text-ink/70">{vote.reference}</dd>
        </div>
      )}
    </dl>
  );
}
