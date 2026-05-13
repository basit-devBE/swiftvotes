"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
import { AppLoadingState } from "@/components/app-loading-state";
import { getEventPayment } from "@/lib/api/votes";

const PAGE_SIZE = 20;

const STATUS_FILTERS: { key: "all" | PaymentStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "SUCCEEDED", label: "Succeeded" },
  { key: "PENDING", label: "Pending" },
  { key: "FAILED", label: "Failed" },
  { key: "ABANDONED", label: "Abandoned" },
  { key: "REFUNDED", label: "Refunded" },
];

const STATUS_STYLES: Record<
  PaymentStatus,
  { color: string; pill: string; soft: string }
> = {
  SUCCEEDED: {
    color: "#0f4cdb",
    pill: "border-[#cfe0ff] bg-[#edf4ff] text-[#0f4cdb]",
    soft: "bg-[#edf4ff] text-[#0f4cdb]",
  },
  PENDING: {
    color: "#f5a13b",
    pill: "border-[#fde68a] bg-[#fffbeb] text-[#92400e]",
    soft: "bg-[#fffbeb] text-[#92400e]",
  },
  FAILED: {
    color: "#b40f17",
    pill: "border-[#f0cfd3] bg-[#fff2f4] text-[#b40f17]",
    soft: "bg-[#fff2f4] text-[#b40f17]",
  },
  ABANDONED: {
    color: "#94a3b8",
    pill: "border-[#dce4f1] bg-[#f4f6fb] text-slate-600",
    soft: "bg-[#f4f6fb] text-slate-600",
  },
  REFUNDED: {
    color: "#7c3aed",
    pill: "border-[#e2d5fb] bg-[#f5efff] text-[#5b21b6]",
    soft: "bg-[#f5efff] text-[#5b21b6]",
  },
};

function formatMoney(minor: number | null | undefined, currency: string | null): string {
  if (minor === null || minor === undefined) return "-";
  const amount = (minor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${amount}` : amount;
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(status: PaymentStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function AdminPaymentsPage() {
  const [data, setData] = useState<PaymentListResponse | null>(null);
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [eventFilter, setEventFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const list = await listAllAdminEvents();
        if (!cancelled) setEvents(list);
      } catch {
        // Event names improve filtering, but the payment page still works without them.
      }
    }

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPayments() {
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
    }

    void loadPayments();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const summary = data?.summary ?? null;
  const currency = summary?.currency ?? data?.rows[0]?.currency ?? null;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const statusCounts = useMemo(() => buildStatusCounts(summary), [summary]);
  const statusMix = useMemo(() => buildStatusMix(summary), [summary]);
  const channelRows = useMemo(() => buildChannelRows(summary), [summary]);

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
    <main className="min-h-screen bg-[#f3f6fb] px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1320px]">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
              Payment reconciliation
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
              Payments
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting || isLoading}
            className="w-fit rounded-2xl bg-ink px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Gross processed"
            value={formatMoney(summary?.grossMinor ?? 0, currency)}
            detail={`${(summary?.totalCount ?? 0).toLocaleString()} total payments`}
            loading={isLoading && !data}
          />
          <MetricCard
            label="Net revenue"
            value={formatMoney(summary?.netMinor ?? 0, currency)}
            detail={`${formatMoney(summary?.feesMinor ?? 0, currency)} fees`}
            loading={isLoading && !data}
          />
          <MetricCard
            label="Succeeded"
            value={(summary?.successCount ?? 0).toLocaleString()}
            detail={`${successRate(summary).toFixed(1)}% success rate`}
            loading={isLoading && !data}
          />
          <MetricCard
            label="Pending"
            value={(summary?.pendingCount ?? 0).toLocaleString()}
            detail={`${(summary?.failedCount ?? 0).toLocaleString()} failed`}
            loading={isLoading && !data}
          />
          <MetricCard
            label="Refunded"
            value={(summary?.refundedCount ?? 0).toLocaleString()}
            detail={`${(summary?.abandonedCount ?? 0).toLocaleString()} abandoned`}
            loading={isLoading && !data}
          />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <TreasuryPanel
            summary={summary}
            currency={currency}
            statusMix={statusMix}
            loading={isLoading && !data}
          />
          <ChannelPanel rows={channelRows} currency={currency} loading={isLoading && !data} />
        </section>

        <section className="mt-4 rounded-[1.5rem] border border-line bg-white p-4 shadow-[0_18px_45px_rgba(7,17,31,0.045)] sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_220px_150px_150px_auto]">
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/32"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search email, reference, provider ref"
                className="h-11 w-full rounded-xl border border-line bg-[#f8fafc] pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-primary focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={eventFilter}
              onChange={(event) => {
                setEventFilter(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-line bg-[#f8fafc] px-3 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All events</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              aria-label="From date"
              className="h-11 rounded-xl border border-line bg-[#f8fafc] px-3 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-blue-100"
            />

            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              aria-label="To date"
              className="h-11 rounded-xl border border-line bg-[#f8fafc] px-3 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="button"
              onClick={resetFilters}
              className="h-11 rounded-xl border border-line px-4 text-xs font-semibold text-ink/55 transition hover:border-primary/35 hover:bg-primary/5 hover:text-ink"
            >
              Reset
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-line/70 pt-4">
            {STATUS_FILTERS.map((filter) => {
              const count =
                filter.key === "all"
                  ? summary?.totalCount
                  : statusCounts.get(filter.key);
              const active = statusFilter === filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(filter.key);
                    setPage(1);
                  }}
                  className={[
                    "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-white text-ink/58 hover:border-primary/35 hover:text-ink",
                  ].join(" ")}
                >
                  {filter.label}
                  {count !== undefined ? (
                    <span className={active ? "ml-1.5 opacity-75" : "ml-1.5 text-ink/38"}>
                      {count.toLocaleString()}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 px-5 py-4 text-sm font-medium text-accent">
            {error}
          </div>
        ) : null}

        <LedgerTable
          data={data}
          isLoading={isLoading}
          pageCount={pageCount}
          page={page}
          setPage={setPage}
          loadingDetailId={loadingDetailId}
          openPayment={openPayment}
        />

        {detail ? (
          <PaymentDetailDrawer detail={detail} onClose={() => setDetail(null)} />
        ) : null}
      </div>
    </main>
  );
}

function buildStatusCounts(summary: PaymentSummaryResponse | null): Map<PaymentStatus, number> {
  const counts = new Map<PaymentStatus, number>();
  for (const bucket of summary?.byStatus ?? []) counts.set(bucket.status, bucket.count);
  return counts;
}

function buildStatusMix(summary: PaymentSummaryResponse | null) {
  return (Object.keys(STATUS_STYLES) as PaymentStatus[])
    .map((status) => ({
      status,
      name: formatStatus(status),
      count: summary?.byStatus.find((bucket) => bucket.status === status)?.count ?? 0,
      color: STATUS_STYLES[status].color,
    }))
    .filter((row) => row.count > 0);
}

function buildChannelRows(summary: PaymentSummaryResponse | null) {
  return (summary?.byChannel ?? []).map((row) => ({
    ...row,
    displayChannel: row.channel || "Unknown",
    displayAmount: row.totalAmountMinor / 100,
  }));
}

function successRate(summary: PaymentSummaryResponse | null): number {
  if (!summary || summary.totalCount === 0) return 0;
  return (summary.successCount / summary.totalCount) * 100;
}

function MetricCard({
  label,
  value,
  detail,
  loading,
}: {
  label: string;
  value: string;
  detail: string;
  loading: boolean;
}) {
  return (
    <article className="min-h-[116px] rounded-[1.25rem] border border-line bg-white p-4 shadow-[0_18px_42px_rgba(7,17,31,0.04)]">
      <p className="text-xs font-medium text-ink/45">{label}</p>
      <p className="mt-3 font-display text-2xl font-semibold text-ink">
        {loading ? (
          <span className="inline-block h-[0.9em] w-28 animate-pulse rounded bg-primary/8" />
        ) : (
          value
        )}
      </p>
      <p className="mt-2 text-xs font-medium text-ink/45">{detail}</p>
    </article>
  );
}

function TreasuryPanel({
  summary,
  currency,
  statusMix,
  loading,
}: {
  summary: PaymentSummaryResponse | null;
  currency: string | null;
  statusMix: Array<{ status: PaymentStatus; name: string; count: number; color: string }>;
  loading: boolean;
}) {
  const total = statusMix.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-line bg-white shadow-[0_24px_60px_rgba(7,17,31,0.06)]">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="relative overflow-hidden rounded-[1.25rem] bg-ink p-6 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,76,219,0.42),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(245,161,59,0.24),transparent_38%)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              Gross, fees, and net
            </p>
            <p className="mt-4 font-display text-5xl font-semibold leading-none text-white">
              {loading ? (
                <span className="inline-block h-[0.9em] w-64 animate-pulse rounded bg-white/12" />
              ) : (
                formatMoney(summary?.grossMinor ?? 0, currency)
              )}
            </p>
            <p className="mt-3 max-w-xl text-sm text-white/58">
              Gross collections, fees, net revenue, and unresolved payment states across the selected filters.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <DarkStat
                label="Net"
                value={formatMoney(summary?.netMinor ?? 0, currency)}
                loading={loading}
              />
              <DarkStat
                label="Fees"
                value={formatMoney(summary?.feesMinor ?? 0, currency)}
                loading={loading}
              />
              <DarkStat
                label="Success"
                value={`${successRate(summary).toFixed(1)}%`}
                loading={loading}
              />
            </div>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-line bg-[#f8fafc] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Status mix</h2>
              <p className="mt-1 text-sm text-ink/45">{total.toLocaleString()} payments</p>
            </div>
          </div>

          <div className="relative mt-4 h-[190px]">
            {loading ? (
              <div className="h-full rounded-2xl bg-white/70" />
            ) : statusMix.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-line bg-white text-sm text-ink/40">
                No payments
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusMix}
                      dataKey="count"
                      nameKey="name"
                      innerRadius="58%"
                      outerRadius="82%"
                      paddingAngle={2}
                    >
                      {statusMix.map((row) => (
                        <Cell key={row.status} fill={row.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        border: "1px solid #d6deeb",
                        borderRadius: 16,
                        boxShadow: "0 18px 45px rgba(7,17,31,0.14)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-medium text-ink/40">Total</span>
                  <span className="font-display text-2xl font-semibold text-ink">
                    {compactNumber(total)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {statusMix.map((row) => (
              <div key={row.status} className="flex items-center gap-2 text-xs text-ink/58">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                <span className="truncate">{row.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DarkStat({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold text-white">
        {loading ? (
          <span className="inline-block h-[0.9em] w-20 animate-pulse rounded bg-white/12" />
        ) : (
          value
        )}
      </p>
    </div>
  );
}

function ChannelPanel({
  rows,
  currency,
  loading,
}: {
  rows: Array<{
    channel: string;
    count: number;
    totalAmountMinor: number;
    displayChannel: string;
    displayAmount: number;
  }>;
  currency: string | null;
  loading: boolean;
}) {
  return (
    <section className="rounded-[1.5rem] border border-line bg-white p-5 shadow-[0_18px_45px_rgba(7,17,31,0.045)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Payment channels</h2>
          <p className="mt-1 text-sm text-ink/45">Collected volume by provider channel.</p>
        </div>
      </div>

      <div className="mt-4 h-[292px]">
        {loading ? (
          <EmptyState label="Loading channel data..." loading />
        ) : rows.length === 0 ? (
          <EmptyState label="No successful channel totals in this filter." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid stroke="#edf1f7" horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#718096" }}
              />
              <YAxis
                dataKey="displayChannel"
                type="category"
                tickLine={false}
                axisLine={false}
                width={96}
                tick={{ fontSize: 11, fill: "#718096" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(15,76,219,0.05)" }}
                contentStyle={{
                  border: "1px solid #d6deeb",
                  borderRadius: 16,
                  boxShadow: "0 18px 45px rgba(7,17,31,0.14)",
                }}
                formatter={(value, _name, item) => {
                  const row = item?.payload as (typeof rows)[number] | undefined;
                  return [
                    formatMoney((Number(value) || 0) * 100, currency),
                    `${row?.count ?? 0} payments`,
                  ];
                }}
              />
              <Bar dataKey="displayAmount" radius={[0, 8, 8, 0]} fill="#0f4cdb" maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function EmptyState({
  label,
  loading = false,
}: {
  label: string;
  loading?: boolean;
}) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-[#f8fafc] text-sm font-medium text-ink/40">
      {loading ? (
        <span className="relative flex h-10 w-10 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-4 border-primary/10" />
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
          <span className="h-2 w-2 rounded-full bg-accent" />
        </span>
      ) : null}
      <span>{label}</span>
    </div>
  );
}

function LedgerTable({
  data,
  isLoading,
  pageCount,
  page,
  setPage,
  loadingDetailId,
  openPayment,
}: {
  data: PaymentListResponse | null;
  isLoading: boolean;
  pageCount: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  loadingDetailId: string | null;
  openPayment: (payment: PaymentResponse) => Promise<void>;
}) {
  return (
    <section className="mt-4 overflow-hidden rounded-[1.5rem] border border-line bg-white shadow-[0_18px_45px_rgba(7,17,31,0.045)]">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Transaction ledger</h2>
          <p className="mt-1 text-sm text-ink/45">
            {data
              ? `${data.total.toLocaleString()} payment records match these filters.`
              : "Loading payment records."}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/42">
              <th className="px-5 py-4">Voter</th>
              <th className="px-5 py-4">Event</th>
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
            {isLoading && !data ? (
              <tr>
                <td colSpan={9} className="px-5 py-10">
                  <AppLoadingState
                    compact
                    label="Loading payments"
                    detail="Fetching ledger rows for this filter."
                  />
                </td>
              </tr>
            ) : null}

            {!isLoading && data?.rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center">
                  <p className="font-display text-xl font-semibold text-ink">No payments found</p>
                  <p className="mt-1 text-sm text-ink/45">Adjust the filters to widen the ledger.</p>
                </td>
              </tr>
            ) : null}

            {data?.rows.map((payment, index) => (
              <tr
                key={payment.id}
                className={[
                  "border-b border-line/60 transition hover:bg-[#f5f9ff]",
                  index % 2 === 1 ? "bg-[#fbfcff]" : "bg-white",
                ].join(" ")}
              >
                <td className="px-5 py-4">
                  <p className="font-semibold text-ink">{payment.voterName || "Unnamed voter"}</p>
                  <p className="mt-1 max-w-[220px] truncate text-xs text-ink/44">
                    {payment.voterEmail}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="max-w-[240px] truncate font-semibold text-ink">
                    {payment.eventName ?? "Unknown event"}
                  </p>
                  <p className="mt-1 max-w-[240px] truncate text-xs text-ink/44">
                    {payment.categoryName ?? "-"}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="max-w-[180px] truncate font-semibold text-ink">
                    {payment.contestantName ?? "-"}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-ink/44">
                    {payment.contestantCode ?? "-"}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={[
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                      STATUS_STYLES[payment.status].pill,
                    ].join(" ")}
                  >
                    {formatStatus(payment.status)}
                  </span>
                </td>
                <td className="px-5 py-4 text-right font-mono text-xs font-semibold text-ink/76">
                  {formatMoney(payment.amountPaidMinor ?? payment.amountMinor, payment.currency)}
                </td>
                <td className="px-5 py-4 text-right font-mono text-xs text-ink/48">
                  {formatMoney(payment.feeMinor, payment.currency)}
                </td>
                <td className="px-5 py-4 text-ink/58">{payment.channel ?? "-"}</td>
                <td className="px-5 py-4 text-ink/58">{formatDateTime(payment.paidAt)}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => void openPayment(payment)}
                    disabled={loadingDetailId === payment.id}
                    className="rounded-xl border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loadingDetailId === payment.id ? "Opening..." : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > 0 ? (
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4 text-sm text-ink/48 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {data.page} of {pageCount} / {data.total.toLocaleString()} payments
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || isLoading}
              className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink/56 transition hover:bg-primary/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page >= pageCount || isLoading}
              className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink/56 transition hover:bg-primary/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
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
  const net =
    payment.amountPaidMinor !== null && payment.feeMinor !== null
      ? payment.amountPaidMinor - payment.feeMinor
      : null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#07111f]/35 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-[0_0_70px_-20px_rgba(7,17,31,0.42)]">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
              Payment detail
            </p>
            <p className="mt-1 font-mono text-xs text-ink/42">{payment.reference}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink/40 transition hover:bg-primary/8 hover:text-ink"
            aria-label="Close payment detail"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="rounded-[1.25rem] bg-ink p-5 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-2xl font-semibold leading-tight text-white">
                  {payment.voterName || "Unnamed voter"}
                </p>
                <p className="mt-1 truncate text-sm text-white/55">{payment.voterEmail}</p>
              </div>
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  STATUS_STYLES[payment.status].soft,
                ].join(" ")}
              >
                {formatStatus(payment.status)}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <DarkDetail label="Amount" value={formatMoney(amount, payment.currency)} />
              <DarkDetail label="Net" value={formatMoney(net, payment.currency)} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailTile label="Fee" value={formatMoney(payment.feeMinor, payment.currency)} />
            <DetailTile label="Channel" value={payment.channel ?? "-"} />
            <DetailTile label="Provider ref" value={payment.providerRef ?? "-"} />
            <DetailTile label="Card last4" value={payment.cardLast4 ?? "-"} />
          </div>

          <div className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            {(
              [
                ["Event", payment.eventName ?? "Unknown"],
                ["Category", payment.categoryName ?? "Unknown"],
                [
                  "Contestant",
                  `${payment.contestantName ?? "Unknown"}${
                    payment.contestantCode ? ` (${payment.contestantCode})` : ""
                  }`,
                ],
                ["Mobile", payment.mobileNumber ?? "-"],
                ["Customer IP", payment.customerIp ?? "-"],
                ["Initialized", formatDateTime(payment.initializedAt)],
                ["Paid", formatDateTime(payment.paidAt)],
                ["Failed", formatDateTime(payment.failedAt)],
                ["Failure reason", payment.failureReason ?? "-"],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="grid grid-cols-[132px_minmax(0,1fr)] gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/34">
                  {label}
                </span>
                <span className="min-w-0 break-words text-ink/68">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <h3 className="font-display text-lg font-semibold text-ink">Webhook timeline</h3>
            <div className="mt-3 space-y-3">
              {detail.webhookEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-[#f8fafc] px-4 py-6 text-center text-sm text-ink/40">
                  No webhook deliveries recorded.
                </div>
              ) : (
                detail.webhookEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-line px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-ink">{event.eventType}</p>
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          event.processed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700",
                        ].join(" ")}
                      >
                        {event.processed ? "Processed" : "Pending"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink/45">
                      {formatDateTime(event.receivedAt)} / signature{" "}
                      {event.signatureValid ? "valid" : "invalid"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function DarkDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-[#f8fafc] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/38">
        {label}
      </p>
      <p className="mt-1 min-w-0 break-words text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
