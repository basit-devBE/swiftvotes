"use client";

import { useEffect, useMemo, useState } from "react";

import { ApiClientError } from "@/lib/api/client";
import {
  AdminPaymentsFilters,
  exportAllAdminPaymentsCsv,
  listAllAdminPayments,
} from "@/lib/api/admin-payments";
import { listAllAdminEvents } from "@/lib/api/events";
import {
  EventResponse,
  PaymentDetailResponse,
  PaymentListResponse,
  PaymentResponse,
  PaymentStatus,
  PaymentSummaryResponse,
} from "@/lib/api/types";
import { getEventPayment } from "@/lib/api/votes";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { key: "all" | PaymentStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "SUCCEEDED", label: "Succeeded" },
  { key: "PENDING", label: "Pending" },
  { key: "FAILED", label: "Failed" },
  { key: "ABANDONED", label: "Abandoned" },
  { key: "REFUNDED", label: "Refunded" },
];

const STATUS_TINTS: Record<PaymentStatus, { bar: string; pill: string }> = {
  SUCCEEDED: {
    bar: "#0f4cdb",
    pill: "border-[#cfe7da] bg-[#eef9f2] text-[#1b6f4b]",
  },
  PENDING: {
    bar: "#e0a311",
    pill: "border-[#fde68a] bg-[#fffbeb] text-[#92400e]",
  },
  FAILED: {
    bar: "#b40f17",
    pill: "border-[#f0cfd3] bg-[#fff2f4] text-[#b40f17]",
  },
  ABANDONED: {
    bar: "#94a3b8",
    pill: "border-[#dce4f1] bg-[#f4f6fb] text-ink/52",
  },
  REFUNDED: {
    bar: "#7c3aed",
    pill: "border-[#e2d5fb] bg-[#f5efff] text-[#5b21b6]",
  },
};

const PAGE_SIZE = 20;

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function formatMoney(minor: number | null | undefined, currency: string | null): string {
  if (minor === null || minor === undefined) return "—";
  const amt = (minor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${amt}` : amt;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(s: PaymentStatus): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const [data, setData] = useState<PaymentListResponse | null>(null);
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [eventFilter, setEventFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [detail, setDetail] = useState<PaymentDetailResponse | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  const filters: AdminPaymentsFilters = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      eventId: eventFilter || undefined,
      from: from || undefined,
      to: to || undefined,
      search: search || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [statusFilter, eventFilter, from, to, search, page],
  );

  // Fetch events once for the dropdown.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listAllAdminEvents();
        if (!cancelled) setEvents(list);
      } catch {
        // non-fatal
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch payments whenever filters change.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await listAllAdminPayments(filters);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : "Unable to load payments.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const summary = data?.summary ?? null;
  const currency = summary?.currency ?? data?.rows[0]?.currency ?? null;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const statusCounts = useMemo(() => {
    const m = new Map<PaymentStatus, number>();
    for (const b of summary?.byStatus ?? []) m.set(b.status, b.count);
    return m;
  }, [summary]);

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportAllAdminPaymentsCsv({
        status: statusFilter === "all" ? undefined : statusFilter,
        eventId: eventFilter || undefined,
        from: from || undefined,
        to: to || undefined,
        search: search || undefined,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
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
      const result = await getEventPayment(payment.eventId, payment.id);
      setDetail(result);
    } finally {
      setLoadingDetailId(null);
    }
  }

  function resetFilters() {
    setStatusFilter("all");
    setEventFilter("");
    setSearchInput("");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <div className="px-8 py-10">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="mb-8 border-b border-line pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Treasury</p>
            <h1 className="mt-3 font-display text-[2.6rem] font-semibold leading-[1] tracking-[-0.04em] text-ink">
              Payments
            </h1>
            <p className="mt-2 text-sm text-ink/52">
              Every transaction across every event — read-only ledger.
            </p>
          </div>
          <button
            onClick={() => void handleExport()}
            disabled={exporting || isLoading}
            className="rounded-full border border-ink/12 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </header>

      {/* ── Aggregate panel — the broadsheet ─────────────────────── */}
      <Aggregate summary={summary} currency={currency} loading={isLoading && !data} />

      {/* ── Filter strip ─────────────────────────────────────────── */}
      <section className="mt-6 rounded-2xl border border-line bg-white/86 p-5 shadow-[0_12px_38px_-30px_rgba(7,17,31,0.18)] backdrop-blur">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          {/* search + dates */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <svg
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="m11 11 3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search voter email or reference…"
                className="h-11 w-full rounded-full border border-ink/10 bg-white pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-primary focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <select
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-full border border-ink/10 bg-white px-4 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All events</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-full border border-ink/10 bg-white px-4 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
              aria-label="From date"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-full border border-ink/10 bg-white px-4 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
              aria-label="To date"
            />
          </div>

          <button
            onClick={resetFilters}
            className="self-start rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/48 transition hover:text-ink"
          >
            Reset
          </button>
        </div>

        {/* status chips */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.key === "all"
                ? summary?.totalCount
                : statusCounts.get(f.key);
            const active = statusFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => {
                  setStatusFilter(f.key);
                  setPage(1);
                }}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-white text-ink/56 hover:border-primary/30 hover:text-ink"
                }`}
              >
                {f.label}
                {count !== undefined && (
                  <span className={`ml-1.5 ${active ? "opacity-70" : "text-ink/40"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/5 px-5 py-4 text-sm font-medium text-accent">
          {error}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────── */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
                <th className="px-5 py-4">Voter</th>
                <th className="px-5 py-4">Event · Category</th>
                <th className="px-5 py-4">Contestant</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Amount</th>
                <th className="px-5 py-4 text-right">Fee</th>
                <th className="px-5 py-4">Channel</th>
                <th className="px-5 py-4">Paid</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !data && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center text-ink/42">
                    Loading payments…
                  </td>
                </tr>
              )}
              {!isLoading && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <p className="font-display text-xl font-semibold tracking-[-0.03em] text-ink">
                      Nothing here yet
                    </p>
                    <p className="mt-1 text-sm text-ink/45">
                      No payments match the current filters.
                    </p>
                  </td>
                </tr>
              )}
              {data?.rows.map((p, idx) => (
                <tr
                  key={p.id}
                  className={`border-b border-line/60 transition hover:bg-[#f8fbff] ${
                    idx % 2 === 1 ? "bg-[#fbfcff]" : "bg-white"
                  }`}
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-ink">
                      {p.voterName || "Unnamed voter"}
                    </p>
                    <p className="mt-0.5 max-w-[220px] truncate text-xs text-ink/44">
                      {p.voterEmail}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-ink">
                      {p.eventName ?? "Unknown event"}
                    </p>
                    <p className="mt-0.5 text-xs text-ink/44">
                      {p.categoryName ?? "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-ink">
                      {p.contestantName ?? "—"}
                    </p>
                    <p className="mt-0.5 font-mono text-[0.65rem] text-ink/44">
                      {p.contestantCode ?? "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${STATUS_TINTS[p.status].pill}`}
                    >
                      {formatStatus(p.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-xs text-ink/72">
                    {formatMoney(
                      p.amountPaidMinor ?? p.amountMinor,
                      p.currency,
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-xs text-ink/48">
                    {formatMoney(p.feeMinor, p.currency)}
                  </td>
                  <td className="px-5 py-4 text-ink/56">{p.channel ?? "—"}</td>
                  <td className="px-5 py-4 text-ink/56">
                    {formatDateTime(p.paidAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => void openPayment(p)}
                      disabled={loadingDetailId === p.id}
                      className="rounded-full border border-primary/16 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loadingDetailId === p.id ? "Opening…" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.total > 0 && (
          <div className="flex items-center justify-between border-t border-line px-5 py-4 text-sm text-ink/48">
            <span>
              Page {data.page} of {pageCount} · {data.total} payments
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink/56 transition hover:bg-primary/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount || isLoading}
                className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink/56 transition hover:bg-primary/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {detail && (
        <PaymentDetailDrawer
          detail={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Aggregate panel — broadsheet
// ────────────────────────────────────────────────────────────────────────────

function Aggregate({
  summary,
  currency,
  loading,
}: {
  summary: PaymentSummaryResponse | null;
  currency: string | null;
  loading: boolean;
}) {
  const total = summary?.totalCount ?? 0;
  const segs = summary
    ? (Object.keys(STATUS_TINTS) as PaymentStatus[])
        .map((status) => ({
          status,
          count: summary.byStatus.find((b) => b.status === status)?.count ?? 0,
        }))
        .filter((s) => s.count > 0)
    : [];

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(245,249,255,0.97)_55%,rgba(232,240,255,0.92)_100%)] shadow-[0_28px_70px_-50px_rgba(7,17,31,0.22)]">
      {/* decorative atmospherics */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,76,219,0.14),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(180,15,23,0.06),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(9,36,102,1)_1px,transparent_1px),linear-gradient(90deg,rgba(9,36,102,1)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
        {/* left — gross headline */}
        <div>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-primary/70">
            Total processed
          </p>
          <p className="mt-3 font-display text-[3.6rem] font-semibold leading-[0.95] tracking-[-0.04em] text-ink sm:text-[4.6rem]">
            {loading ? (
              <span className="inline-block h-[0.9em] w-[300px] max-w-full animate-pulse rounded bg-primary/8" />
            ) : (
              formatMoney(summary?.grossMinor ?? 0, currency)
            )}
          </p>
          <p className="mt-2 text-sm text-ink/48">
            Across {total.toLocaleString()} payment{total === 1 ? "" : "s"}{" "}
            {summary?.successCount ? (
              <>· <span className="font-medium text-ink/64">{summary.successCount}</span> successful</>
            ) : null}
          </p>

          {/* hairline + subordinate metrics */}
          <div className="mt-7 grid grid-cols-2 gap-6 border-t border-ink/10 pt-6 sm:grid-cols-3">
            <SubordinateNumber
              label="Net after fees"
              value={loading ? null : formatMoney(summary?.netMinor ?? 0, currency)}
            />
            <SubordinateNumber
              label="Fees paid"
              value={loading ? null : formatMoney(summary?.feesMinor ?? 0, currency)}
            />
            <SubordinateNumber
              label="Successful"
              value={loading ? null : (summary?.successCount ?? 0).toLocaleString()}
            />
          </div>
        </div>

        {/* right — status mix as a stacked ledger bar */}
        <div className="flex flex-col">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-primary/70">
            Status mix
          </p>

          {segs.length === 0 ? (
            <p className="mt-4 text-sm text-ink/45">
              No payments yet for the current filter.
            </p>
          ) : (
            <>
              {/* stacked bar */}
              <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full ring-1 ring-ink/8">
                {segs.map((s) => (
                  <div
                    key={s.status}
                    title={`${formatStatus(s.status)}: ${s.count}`}
                    style={{
                      width: `${(s.count / total) * 100}%`,
                      backgroundColor: STATUS_TINTS[s.status].bar,
                    }}
                  />
                ))}
              </div>

              {/* legend */}
              <ul className="mt-5 space-y-2.5">
                {segs.map((s) => {
                  const pct = ((s.count / total) * 100).toFixed(1);
                  return (
                    <li
                      key={s.status}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: STATUS_TINTS[s.status].bar }}
                        />
                        <span className="text-ink/72">{formatStatus(s.status)}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xs text-ink/48">{pct}%</span>
                        <span className="font-display text-base font-semibold text-ink">
                          {s.count.toLocaleString()}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SubordinateNumber({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
        {label}
      </p>
      <p className="mt-1.5 font-display text-xl font-semibold tracking-tight text-ink/82">
        {value ?? (
          <span className="inline-block h-[0.9em] w-[80%] animate-pulse rounded bg-primary/8" />
        )}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Drill-in drawer
// ────────────────────────────────────────────────────────────────────────────

function PaymentDetailDrawer({
  detail,
  onClose,
}: {
  detail: PaymentDetailResponse;
  onClose: () => void;
}) {
  const p = detail.payment;
  const amount = p.amountPaidMinor ?? p.amountMinor;
  const net =
    p.amountPaidMinor != null && p.feeMinor != null
      ? p.amountPaidMinor - p.feeMinor
      : null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#07111f]/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-[0_0_60px_-20px_rgba(7,17,31,0.36)]">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-ink/40">
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
                {p.voterName || "Unnamed voter"}
              </p>
              <p className="mt-1 truncate text-sm text-ink/48">{p.voterEmail}</p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] ${STATUS_TINTS[p.status].pill}`}
            >
              {formatStatus(p.status)}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-[#fbfcff] px-4 py-3.5">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-ink/40">
                Amount
              </p>
              <p className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">
                {formatMoney(amount, p.currency)}
              </p>
              <p className="mt-1 font-mono text-[0.65rem] text-ink/44">
                Fee {formatMoney(p.feeMinor, p.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-[#fbfcff] px-4 py-3.5">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-ink/40">
                Net
              </p>
              <p className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">
                {formatMoney(net, p.currency)}
              </p>
              <p className="mt-1 font-mono text-[0.65rem] text-ink/44">
                {p.channel ?? "Channel pending"}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            {(
              [
                ["Event", p.eventName ?? "Unknown"],
                ["Category", p.categoryName ?? "Unknown"],
                ["Contestant", `${p.contestantName ?? "Unknown"}${p.contestantCode ? ` (${p.contestantCode})` : ""}`],
                ["Reference", p.reference],
                ["Provider ref", p.providerRef ?? "—"],
                ["Card last4", p.cardLast4 ?? "—"],
                ["Mobile", p.mobileNumber ?? "—"],
                ["Initialized", formatDateTime(p.initializedAt)],
                ["Paid", formatDateTime(p.paidAt)],
                ["Failed", formatDateTime(p.failedAt)],
                ["Failure reason", p.failureReason ?? "—"],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[120px_minmax(0,1fr)] gap-3"
              >
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink/34">
                  {label}
                </span>
                <span className="min-w-0 break-words text-ink/68">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
