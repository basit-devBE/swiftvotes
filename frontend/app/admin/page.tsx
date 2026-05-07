"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getAdminOverview,
  getAdminTimeseries,
  getAdminTopCategories,
  getAdminTopEvents,
  OverviewMetrics,
  PeriodKey,
  RevenueBucket,
  TimeseriesMetric,
  TimeseriesResponse,
  TopBy,
  TopCategoryEntry,
  TopEventEntry,
} from "@/lib/api/admin-metrics";
import { listPendingEvents } from "@/lib/api/events";
import { EventResponse, EventStatus } from "@/lib/api/types";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];

const TIMESERIES_OPTIONS: { key: TimeseriesMetric; label: string }[] = [
  { key: "votes", label: "Votes" },
  { key: "revenue", label: "Revenue" },
  { key: "events", label: "New events" },
];

const TOP_BY_OPTIONS: { key: TopBy; label: string }[] = [
  { key: "votes", label: "Votes" },
  { key: "revenue", label: "Revenue" },
];

const STATUS_GRID_ORDER: EventStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "VOTING_LIVE",
  "ARCHIVED",
];

const BAR_COLORS = ["#0f4cdb", "#2f6fed", "#5b8def", "#8aafff", "#b9ccff", "#d8e1f5"];

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMoney(minor: number, currency: string | null): string {
  if (!currency) return `${(minor / 100).toFixed(2)}`;
  return `${currency} ${(minor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dominantRevenue(buckets: RevenueBucket[]): RevenueBucket | null {
  if (buckets.length === 0) return null;
  return buckets.reduce((a, b) => (a.grossMinor >= b.grossMinor ? a : b));
}

function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-xs font-medium text-ink/40">— vs prev</span>;
  }
  const up = pct >= 0;
  const cls = up
    ? "border-[#cfe7da] bg-[#eef9f2] text-[#1b6f4b]"
    : "border-[#f0cfd3] bg-[#fff2f4] text-[#b40f17]";
  const arrow = up ? "▲" : "▼";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${cls}`}
    >
      <span>{arrow}</span>
      <span>{Math.abs(pct).toFixed(1)}%</span>
    </span>
  );
}

function KpiCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white px-6 py-5 transition hover:border-primary/20">
      <p className="text-sm font-medium text-ink/50">{label}</p>
      <p className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-primary">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {delta !== undefined && <Delta pct={delta ?? null} />}
        {hint && <span className="text-xs text-ink/40">{hint}</span>}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [pending, setPending] = useState<EventResponse[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesResponse | null>(null);
  const [topEvents, setTopEvents] = useState<TopEventEntry[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategoryEntry[]>([]);

  const [tsMetric, setTsMetric] = useState<TimeseriesMetric>("votes");
  const [topEventsBy, setTopEventsBy] = useState<TopBy>("votes");
  const [topCatBy, setTopCatBy] = useState<TopBy>("votes");

  const [isLoading, setIsLoading] = useState(true);
  const [tsLoading, setTsLoading] = useState(false);
  const [topEventsLoading, setTopEventsLoading] = useState(false);
  const [topCatLoading, setTopCatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Top-level: overview + pending list. Refetched when period changes.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [ov, pendingEvents] = await Promise.all([
          getAdminOverview(period),
          listPendingEvents(),
        ]);
        if (!cancelled) {
          setOverview(ov);
          setPending(pendingEvents);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load metrics.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  // Time-series — only for bounded periods.
  useEffect(() => {
    if (period === "all") return;
    const boundedPeriod = period;
    let cancelled = false;
    async function load() {
      setTsLoading(true);
      try {
        const ts = await getAdminTimeseries({ metric: tsMetric, period: boundedPeriod });
        if (!cancelled) setTimeseries(ts);
      } finally {
        if (!cancelled) setTsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [period, tsMetric]);

  // Top events.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setTopEventsLoading(true);
      try {
        const data = await getAdminTopEvents({ by: topEventsBy, period, limit: 8 });
        if (!cancelled) setTopEvents(data);
      } finally {
        if (!cancelled) setTopEventsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [period, topEventsBy]);

  // Top categories.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setTopCatLoading(true);
      try {
        const data = await getAdminTopCategories({ by: topCatBy, period, limit: 8 });
        if (!cancelled) setTopCategories(data);
      } finally {
        if (!cancelled) setTopCatLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [period, topCatBy]);

  const dominant = useMemo(
    () => (overview ? dominantRevenue(overview.period.revenueByCurrency) : null),
    [overview],
  );
  const dominantPrev = useMemo(
    () =>
      overview?.previousPeriod
        ? dominantRevenue(overview.previousPeriod.revenueByCurrency)
        : null,
    [overview],
  );
  const eventsByStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of overview?.eventsByStatus ?? []) map.set(r.status, r.count);
    return map;
  }, [overview]);

  return (
    <div className="px-8 py-10">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-kicker">Admin panel</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
            Overview
          </h1>
          <p className="mt-1.5 text-sm text-ink/50">
            Platform-wide analytics. Read-only — admin actions live in their own pages.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-2xl border border-line bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                period === p.key
                  ? "bg-primary text-white"
                  : "text-ink/52 hover:bg-primary/5 hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-accent/20 bg-accent/5 px-5 py-4 text-sm font-medium text-accent">
          {error}
        </div>
      )}

      {isLoading && !overview ? (
        <p className="text-sm text-ink/40">Loading metrics…</p>
      ) : overview ? (
        <>
          {/* ── KPI strip ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Votes in period"
              value={overview.period.votes.toLocaleString()}
              delta={
                overview.previousPeriod
                  ? deltaPercent(overview.period.votes, overview.previousPeriod.votes)
                  : undefined
              }
              hint={`${overview.period.paidVotes} paid · ${overview.period.freeVotes} free`}
            />
            <KpiCard
              label="Revenue (gross)"
              value={
                dominant
                  ? formatMoney(dominant.grossMinor, dominant.currency)
                  : "—"
              }
              delta={
                overview.previousPeriod && dominant && dominantPrev
                  ? deltaPercent(dominant.grossMinor, dominantPrev.grossMinor)
                  : undefined
              }
              hint={
                dominant
                  ? `Net ${formatMoney(dominant.netMinor, dominant.currency)} · ${dominant.successCount} payments`
                  : "No revenue in period"
              }
            />
            <KpiCard
              label="New events"
              value={overview.period.newEvents.toLocaleString()}
              delta={
                overview.previousPeriod
                  ? deltaPercent(
                      overview.period.newEvents,
                      overview.previousPeriod.newEvents,
                    )
                  : undefined
              }
              hint={`${overview.totals.events} total events`}
            />
            <KpiCard
              label="New users"
              value={overview.period.newUsers.toLocaleString()}
              delta={
                overview.previousPeriod
                  ? deltaPercent(
                      overview.period.newUsers,
                      overview.previousPeriod.newUsers,
                    )
                  : undefined
              }
              hint={`${overview.totals.activeUsers} active · ${overview.totals.users} total`}
            />
          </div>

          {/* ── Time-series ───────────────────────────────────────── */}
          {period !== "all" && (
            <section className="mt-8 rounded-2xl border border-line bg-white p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
                    Trend
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold tracking-[-0.03em] text-ink">
                    {TIMESERIES_OPTIONS.find((o) => o.key === tsMetric)?.label}{" "}
                    over the last {period}
                  </h2>
                </div>
                <div className="flex gap-1 rounded-xl border border-line bg-white p-1">
                  {TIMESERIES_OPTIONS.map((o) => (
                    <button
                      key={o.key}
                      onClick={() => setTsMetric(o.key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        tsMetric === o.key
                          ? "bg-primary text-white"
                          : "text-ink/56 hover:text-ink"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 h-[260px] w-full">
                {tsLoading && !timeseries ? (
                  <div className="flex h-full items-center justify-center text-sm text-ink/40">
                    Loading…
                  </div>
                ) : timeseries && timeseries.buckets.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={
                        tsMetric === "revenue"
                          ? timeseries.buckets.map((b) => ({
                              ...b,
                              displayValue: b.value / 100,
                            }))
                          : timeseries.buckets
                      }
                      margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="seriesFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0f4cdb" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="#0f4cdb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v: string) => v.slice(5)}
                        tick={{ fontSize: 11, fill: "#5d6577" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        tick={{ fontSize: 11, fill: "#5d6577" }}
                        allowDecimals={tsMetric === "revenue"}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid rgba(15,76,219,0.12)",
                          fontSize: 12,
                        }}
                        formatter={(v) => {
                          if (tsMetric === "revenue") {
                            return [
                              formatMoney(Number(v) * 100, timeseries.currency),
                              "Revenue",
                            ];
                          }
                          return [Number(v).toLocaleString(), tsMetric === "votes" ? "Votes" : "Events"];
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={tsMetric === "revenue" ? "displayValue" : "value"}
                        stroke="#0f4cdb"
                        strokeWidth={2}
                        fill="url(#seriesFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-ink/40">
                    No data for this period
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Top events + categories ──────────────────────────── */}
          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <TopBarsCard
              title="Top events"
              by={topEventsBy}
              setBy={setTopEventsBy}
              loading={topEventsLoading}
              data={topEvents.map((e) => ({
                key: e.eventId,
                label: e.eventName,
                hint: formatStatus(e.eventStatus),
                value: e.value,
                currency: e.currency,
              }))}
            />
            <TopBarsCard
              title="Top categories"
              by={topCatBy}
              setBy={setTopCatBy}
              loading={topCatLoading}
              data={topCategories.map((c) => ({
                key: c.categoryId,
                label: c.categoryName,
                hint: c.eventName,
                value: c.value,
                currency: c.currency,
              }))}
            />
          </div>

          {/* ── Pending review preview ──────────────────────────── */}
          {pending.length > 0 && (
            <div className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold tracking-[-0.03em] text-ink">
                  Awaiting review
                </h2>
                <Link
                  href="/admin/events"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {pending.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">{event.name}</p>
                      <p className="mt-0.5 text-xs text-ink/45">
                        {event.categories.length} categories · Submitted{" "}
                        {event.submittedAt
                          ? new Date(event.submittedAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <Link
                      href="/admin/events"
                      className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-deep"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Events by status ───────────────────────────────── */}
          <div className="mt-10">
            <h2 className="mb-4 font-display text-lg font-semibold tracking-[-0.03em] text-ink">
              Events by status
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {STATUS_GRID_ORDER.map((s) => (
                <div
                  key={s}
                  className="rounded-xl border border-line bg-white px-4 py-3"
                >
                  <p className="text-xs font-medium text-ink/45">
                    {formatStatus(s)}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-ink">
                    {eventsByStatus.get(s) ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function TopBarsCard({
  title,
  by,
  setBy,
  loading,
  data,
}: {
  title: string;
  by: TopBy;
  setBy: (b: TopBy) => void;
  loading: boolean;
  data: {
    key: string;
    label: string;
    hint: string;
    value: number;
    currency: string | null;
  }[];
}) {
  const chartData =
    by === "revenue"
      ? data.map((d) => ({ ...d, displayValue: d.value / 100 }))
      : data;

  return (
    <section className="rounded-2xl border border-line bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold tracking-[-0.03em] text-ink">
          {title}
        </h2>
        <div className="flex gap-1 rounded-xl border border-line bg-white p-1">
          {TOP_BY_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setBy(o.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                by === o.key
                  ? "bg-primary text-white"
                  : "text-ink/56 hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-[300px] w-full">
        {loading && data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-ink/40">
            Loading…
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-ink/40">
            Nothing to show for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 6, right: 24, left: 8, bottom: 6 }}
            >
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#5d6577" }}
                allowDecimals={by === "revenue"}
              />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                axisLine={false}
                width={140}
                tick={{ fontSize: 11, fill: "#5d6577" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(15,76,219,0.06)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(15,76,219,0.12)",
                  fontSize: 12,
                }}
                formatter={(v, _name, item) => {
                  const payload = item?.payload as
                    | { value: number; currency: string | null }
                    | undefined;
                  if (by === "revenue" && payload) {
                    return [
                      formatMoney(payload.value, payload.currency),
                      "Revenue",
                    ];
                  }
                  return [Number(v).toLocaleString(), "Votes"];
                }}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload as
                    | { hint: string }
                    | undefined;
                  return item ? `${label} — ${item.hint}` : String(label);
                }}
              />
              <Bar
                dataKey={by === "revenue" ? "displayValue" : "value"}
                radius={[0, 6, 6, 0]}
              >
                {chartData.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={BAR_COLORS[Math.min(idx, BAR_COLORS.length - 1)]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
