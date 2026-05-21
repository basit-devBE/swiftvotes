"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { RequireAuth } from "@/components/auth/require-auth";
import { AppLoadingState } from "@/components/app-loading-state";
import { ApiClientError } from "@/lib/api/client";
import { redeemIssuedTicket } from "@/lib/api/events";
import { RedeemedIssuedTicketResponse } from "@/lib/api/types";

function TicketRedeemCard({ eventId }: { eventId: string }) {
  const searchParams = useSearchParams();
  const codeFromUrl = useMemo(
    () => (searchParams.get("code") ?? "").trim().toUpperCase(),
    [searchParams],
  );
  const [code, setCode] = useState(codeFromUrl);
  const [result, setResult] = useState<RedeemedIssuedTicketResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRedeem() {
    if (!code.trim()) {
      setError("Ticket code is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const redeemed = await redeemIssuedTicket(eventId, code.trim().toUpperCase());
      setResult(redeemed);
    } catch (redeemError) {
      setResult(null);
      setError(
        redeemError instanceof ApiClientError
          ? redeemError.message
          : "Unable to redeem this ticket right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <section className="overflow-hidden rounded-[2rem] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,249,255,0.97)_58%,rgba(242,246,252,0.95)_100%)] shadow-[0_28px_70px_-48px_rgba(7,17,31,0.24)]">
        <div className="border-b border-[#edf2f8] px-6 py-6 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/72">
            Ticket validation
          </p>
          <h1 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.04em] text-ink sm:text-[2.4rem]">
            Redeem event ticket
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/58">
            Scan the attendee QR code, review the ticket code, and confirm entry. This action should only be done by the event owner or an event admin.
          </p>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[1.5rem] border border-[#e4eaf4] bg-white p-5 shadow-[0_16px_36px_-28px_rgba(7,17,31,0.18)]">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/48">
                Ticket code
              </span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="SWT-XXXXXXXXXX"
                className="mt-3 h-12 w-full rounded-2xl border border-[#dfe7f3] bg-[#fbfcff] px-4 font-mono text-sm tracking-[0.08em] text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleRedeem()}
              disabled={isSubmitting}
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f4cdb_0%,#215de4_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_34px_-20px_rgba(15,76,219,0.9)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isSubmitting ? "Confirming entry..." : "Confirm redemption"}
            </button>

            {error ? (
              <div className="mt-5 rounded-2xl border border-[#f1c6c8] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#8f2430]">
                {error}
              </div>
            ) : null}

            {result ? (
              <div className="mt-5 rounded-[1.4rem] border border-[#bfe4d2] bg-[#f2fbf6] p-5 shadow-[0_18px_34px_-28px_rgba(27,111,75,0.45)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1b6f4b]">
                  Entry confirmed
                </p>
                <h2 className="mt-2 font-display text-[1.6rem] font-semibold tracking-[-0.03em] text-ink">
                  {result.ticketTypeName}
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#d9ebe2] bg-white px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/38">
                      Guest
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ink">{result.buyerName}</p>
                    <p className="mt-1 text-xs text-ink/48">{result.buyerEmail}</p>
                  </div>
                  <div className="rounded-2xl border border-[#d9ebe2] bg-white px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/38">
                      Ticket code
                    </p>
                    <p className="mt-2 font-mono text-sm font-semibold text-ink">{result.code}</p>
                  </div>
                  <div className="rounded-2xl border border-[#d9ebe2] bg-white px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/38">
                      Event
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ink">{result.eventName}</p>
                  </div>
                  <div className="rounded-2xl border border-[#d9ebe2] bg-white px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/38">
                      Redeemed at
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ink">
                      {result.checkedInAt
                        ? new Date(result.checkedInAt).toLocaleString()
                        : "Just now"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="rounded-[1.5rem] border border-[#e4eaf4] bg-white p-5 shadow-[0_16px_36px_-28px_rgba(7,17,31,0.18)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/46">
              Checklist
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-ink/56">
              <li>Confirm the attendee is at the entrance before redeeming.</li>
              <li>Each ticket can only be checked in once.</li>
              <li>Use manual code entry if the QR scan fails.</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-[#edf2f8] bg-[#f8fbff] px-4 py-3 text-xs leading-6 text-ink/50">
              After redemption, the ticket status changes immediately and cannot be used again.
            </div>
            <Link
              href={`/events/${eventId}/manage`}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-[#d7e0ed] bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-primary/35 hover:text-primary"
            >
              Back to event workspace
            </Link>
          </aside>
        </div>
      </section>
    </div>
  );
}

export function TicketRedeemView({ eventId }: { eventId: string }) {
  return (
    <RequireAuth>
      <TicketRedeemCard eventId={eventId} />
    </RequireAuth>
  );
}
