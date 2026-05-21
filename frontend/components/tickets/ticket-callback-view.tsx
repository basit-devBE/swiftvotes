"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppLoadingState } from "@/components/app-loading-state";
import { ApiClientError } from "@/lib/api/client";
import { verifyTicketOrder } from "@/lib/api/events";
import { TicketOrderResponse } from "@/lib/api/types";

type State =
  | { kind: "loading" }
  | { kind: "missing-params" }
  | { kind: "error"; message: string }
  | { kind: "result"; order: TicketOrderResponse };

function formatAmount(minor: number, currency: string): string {
  return `${currency} ${(minor / 100).toFixed(2)}`;
}

export function TicketCallbackView() {
  const params = useSearchParams();
  const eventId = params.get("eventId");
  const reference = params.get("reference") ?? params.get("trxref");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function verifyPayment() {
      if (!eventId || !reference) {
        setState({ kind: "missing-params" });
        return;
      }

      const safeEventId = eventId;
      const safeReference = reference;
      let attempts = 0;
      const maxAttempts = 4;

      async function poll() {
        attempts += 1;
        try {
          const order = await verifyTicketOrder(safeEventId, safeReference);
          if (cancelled) return;

          if (order.status === "PENDING" && attempts < maxAttempts) {
            setTimeout(() => {
              if (!cancelled) void poll();
            }, 2000);
            return;
          }

          setState({ kind: "result", order });
        } catch (err) {
          if (cancelled) return;
          setState({
            kind: "error",
            message:
              err instanceof ApiClientError
                ? err.message
                : "Could not verify your ticket payment. Please contact support if you were charged.",
          });
        }
      }

      setState({ kind: "loading" });
      await poll();
    }

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [eventId, reference]);

  if (state.kind === "loading") {
    return (
      <AppLoadingState
        label="Confirming ticket payment"
        detail="This usually takes a few seconds. Do not close this page."
      />
    );
  }

  if (state.kind === "missing-params") {
    return (
      <ResultShell
        tone="error"
        title="Something's missing from the link"
        body="We could not read the ticket payment reference from this URL."
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

  const { order } = state;

  if (order.status === "PAID") {
    return (
      <ResultShell
        tone="success"
        title="Tickets confirmed"
        body="Your payment has been confirmed and your tickets have been issued."
      >
        <TicketReceipt order={order} />
        <Link href={`/events/${order.eventId}`} className="button-primary">
          Back to event
        </Link>
      </ResultShell>
    );
  }

  if (order.status === "FAILED") {
    return (
      <ResultShell
        tone="error"
        title="Payment did not go through"
        body="Your card or wallet was not charged successfully, so no tickets were issued."
      >
        <Link href={`/events/${order.eventId}`} className="button-primary">
          Try again
        </Link>
      </ResultShell>
    );
  }

  return (
    <ResultShell
      tone="warning"
      title="Still processing"
      body="Your payment provider has not confirmed the payment yet. Refresh this page shortly if you were charged."
    >
      <TicketReceipt order={order} />
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
          <div className="mt-6 flex w-full flex-col items-center gap-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketReceipt({ order }: { order: TicketOrderResponse }) {
  return (
    <dl className="w-full divide-y divide-ink/8 rounded-2xl border border-ink/10 bg-[#f7f9fc] text-left">
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <dt className="text-ink/55">Tickets</dt>
        <dd className="font-semibold text-ink">
          {order.items.reduce((sum, item) => sum + item.quantity, 0)}
        </dd>
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <dt className="text-ink/55">Amount</dt>
        <dd className="font-semibold text-ink">
          {formatAmount(order.totalAmountMinor, order.currency)}
        </dd>
      </div>
      {order.items.map((item) => (
        <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
          <dt className="text-ink/55">{item.ticketTypeName ?? "Ticket"}</dt>
          <dd className="text-right font-semibold text-ink">
            {item.quantity} x {formatAmount(item.unitPriceMinor, order.currency)}
          </dd>
        </div>
      ))}
      {order.issuedTickets.length > 0 && (
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
      )}
      {order.payment?.reference && (
        <div className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[6rem_1fr] sm:items-start">
          <dt className="text-ink/55">Reference</dt>
          <dd className="break-all font-mono text-xs leading-5 text-ink/70 sm:text-right">
            {order.payment.reference}
          </dd>
        </div>
      )}
    </dl>
  );
}
