"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
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

const TOP_BY_OPTIONS: { key: TopBy; label: string }[] = [
  { key: "votes", label: "Votes" },
  { key: "revenue", label: "Revenue" },
];

const STATUS_ORDER: EventStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "REJECTED",
  "APPROVED",
  "NOMINATIONS_OPEN",
  "NOMINATIONS_CLOSED",
  "VOTING_SCHEDULED",
  "VOTING_LIVE",
  "VOTING_CLOSED",
  "ARCHIVED",
];

const CATEGORY_COLORS = [
  "#6f8ff6",
  "#f5a13b",
  "#35b98f",
  "#cc5de8",
  "#f05262",
  "#4fb3d8",
  "#8b5cf6",
  "#7ccba2",
];

const EVENT_BAR_COLORS = ["#0f4cdb", "#2f6fed", "#5b8def", "#f5a13b", "#35b98f"];

type SeriesBundle = {
  votes: TimeseriesResponse;
  revenue: TimeseriesResponse;
  events: TimeseriesResponse;
};

type DashboardPoint = {
  date: string;
  label: string;
  votes: number;
  revenue: number;
  events: number;
};

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMoney(minor: number | null | undefined, currency: string | null): string {
  if (minor === null || minor === undefined) return "—";
  const amount = minor / 100;
  if (!currency) {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dominantRevenue(buckets: RevenueBucket[]): RevenueBucket | null {
  if (buckets.length === 0) return null;
  return buckets.reduce((best, current) =>
    best.grossMinor >= current.grossMinor ? best : current,
  );
}

function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function safeMax(values: number[]): number {
  const max = Math.max(0, ...values);
  return max === 0 ? 1 : max;
}

function chartPeriodFor(period: PeriodKey): Exclude<PeriodKey, "all"> {
  return period === "all" ? "90d" : period;
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [pending, setPending] = useState<EventResponse[]>([]);
  const [series, setSeries] = useState<SeriesBundle | null>(null);
  const [topEvents, setTopEvents] = useState<TopEventEntry[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategoryEntry[]>([]);
  const [topEventsBy, setTopEventsBy] = useState<TopBy>("votes");
  const [topCatBy, setTopCatBy] = useState<TopBy>("votes");
  const [isLoading, setIsLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [topEventsLoading, setTopEventsLoading] = useState(false);
  const [topCatLoading, setTopCatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [metrics, pendingEvents] = await Promise.all([
          getAdminOverview(period),
          listPendingEvents(),
        ]);
        if (!cancelled) {
          setOverview(metrics);
          setPending(pendingEvents);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load admin metrics.");
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

  useEffect(() => {
    let cancelled = false;
    const boundedPeriod = chartPeriodFor(period);

    async function load() {
      setSeriesLoading(true);
      try {
        const [votes, revenue, events] = await Promise.all([
          getAdminTimeseries({ metric: "votes", period: boundedPeriod }),
          getAdminTimeseries({ metric: "revenue", period: boundedPeriod }),
          getAdminTimeseries({ metric: "events", period: boundedPeriod }),
        ]);
        if (!cancelled) setSeries({ votes, revenue, events });
      } finally {
        if (!cancelled) setSeriesLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setTopEventsLoading(true);
      try {
        const data = await getAdminTopEvents({ by: topEventsBy, period, limit: 7 });
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
  const previousDominant = useMemo(
    () =>
      overview?.previousPeriod
        ? dominantRevenue(overview.previousPeriod.revenueByCurrency)
        : null,
    [overview],
  );
  const chartData = useMemo(() => buildDashboardSeries(series), [series]);
  const statusRows = useMemo(() => buildStatusRows(overview), [overview]);
  const categoryDonut = useMemo(
    () =>
      topCategories.map((category, index) => ({
        id: category.categoryId,
        name: category.categoryName,
        eventName: category.eventName,
        value: topCatBy === "revenue" ? category.value / 100 : category.value,
        rawValue: category.value,
        currency: category.currency,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      })),
    [topCategories, topCatBy],
  );

  const voteDelta =
    overview?.previousPeriod === null || overview?.previousPeriod === undefined
      ? undefined
      : deltaPercent(overview.period.votes, overview.previousPeriod.votes);
  const revenueDelta =
    dominant && previousDominant
      ? deltaPercent(dominant.grossMinor, previousDominant.grossMinor)
      : undefined;
  const eventsDelta =
    overview?.previousPeriod === null || overview?.previousPeriod === undefined
      ? undefined
      : deltaPercent(overview.period.newEvents, overview.previousPeriod.newEvents);
  const usersDelta =
    overview?.previousPeriod === null || overview?.previousPeriod === undefined
      ? undefined
      : deltaPercent(overview.period.newUsers, overview.previousPeriod.newUsers);

  return (
    <main className="min-h-screen bg-[#f3f6fb] px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1320px]">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
              Platform command
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
              Dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-line bg-white p-1 shadow-[0_18px_40px_rgba(7,17,31,0.05)]">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={[
                    "rounded-xl px-3 py-2 text-xs font-semibold transition",
                    period === p.key
                      ? "bg-primary text-white shadow-[0_10px_22px_rgba(15,76,219,0.22)]"
                      : "text-ink/55 hover:bg-primary/7 hover:text-ink",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Link
              href="/admin/payments"
              className="rounded-2xl border border-dashed border-primary/35 bg-white px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
            >
              Open ledger
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-2xl border border-accent/20 bg-accent/5 px-5 py-4 text-sm font-medium text-accent">
            {error}
          </div>
        )}

        {isLoading && !overview ? (
          <div className="rounded-[1.5rem] border border-line bg-white p-8 text-sm text-ink/45">
            Loading dashboard data...
          </div>
        ) : overview ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                label="Total votes"
                value={overview.period.votes.toLocaleString()}
                subValue={`${overview.period.paidVotes.toLocaleString()} paid / ${overview.period.freeVotes.toLocaleString()} free`}
                delta={voteDelta}
              />
              <KpiCard
                label="Gross revenue"
                value={dominant ? formatMoney(dominant.grossMinor, dominant.currency) : "—"}
                subValue={
                  dominant
                    ? `${formatMoney(dominant.netMinor, dominant.currency)} net`
                    : "No successful payments"
                }
                delta={revenueDelta}
              />
              <KpiCard
                label="Events created"
                value={overview.period.newEvents.toLocaleString()}
                subValue={`${overview.totals.events.toLocaleString()} total events`}
                delta={eventsDelta}
              />
              <KpiCard
                label="New users"
                value={overview.period.newUsers.toLocaleString()}
                subValue={`${overview.totals.activeUsers.toLocaleString()} active users`}
                delta={usersDelta}
              />
              <KpiCard
                label="Contestants"
                value={overview.totals.contestants.toLocaleString()}
                subValue={`${overview.period.uniqueVoters.toLocaleString()} unique voters`}
              />
            </section>

            <section className="mt-4 rounded-[1.5rem] border border-line bg-white p-4 shadow-[0_24px_60px_rgba(7,17,31,0.06)] sm:p-5">
              <div className="flex flex-col gap-4 border-b border-line/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    Vote and revenue trend
                  </h2>
                  <p className="mt-1 text-sm text-ink/50">
                    {period === "all"
                      ? "Showing the last 90 days because all-time charts are intentionally bounded."
                      : `Showing the last ${period}.`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-semibold">
                  <LegendPill color="#0f4cdb" label="Votes" />
                  <LegendPill color="#f5a13b" label="Revenue" />
                  <LegendPill color="#35b98f" label="New events" />
                </div>
              </div>

              <div className="mt-4 h-[360px]">
                {seriesLoading && !series ? (
                  <EmptyPanel label="Loading chart..." />
                ) : chartData.length === 0 ? (
                  <EmptyPanel label="No chart data for this period" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 18, right: 18, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid stroke="#e8edf5" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#718096" }}
                      />
                      <YAxis
                        yAxisId="votes"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#718096" }}
                        width={44}
                      />
                      <YAxis
                        yAxisId="revenue"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#718096" }}
                        width={54}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(15,76,219,0.05)" }}
                        content={<DashboardTooltip currency={series?.revenue.currency ?? null} />}
                      />
                      <Bar
                        yAxisId="votes"
                        dataKey="votes"
                        radius={[8, 8, 0, 0]}
                        fill="#6f8ff6"
                        maxBarSize={28}
                      />
                      <Bar
                        yAxisId="revenue"
                        dataKey="revenue"
                        radius={[8, 8, 0, 0]}
                        fill="#f5a13b"
                        maxBarSize={28}
                      />
                      <Line
                        yAxisId="votes"
                        type="monotone"
                        dataKey="events"
                        stroke="#35b98f"
                        strokeWidth={3}
                        dot={{ r: 3, fill: "#35b98f", strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <TopEventsPanel
                by={topEventsBy}
                setBy={setTopEventsBy}
                loading={topEventsLoading}
                rows={topEvents}
              />
              <CategoryDonutPanel
                by={topCatBy}
                setBy={setTopCatBy}
                loading={topCatLoading}
                rows={categoryDonut}
              />
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <StatusPanel rows={statusRows} />
              <PendingPanel pending={pending} />
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function buildDashboardSeries(series: SeriesBundle | null): DashboardPoint[] {
  if (!series) return [];

  const byDate = new Map<string, DashboardPoint>();

  for (const bucket of series.votes.buckets) {
    byDate.set(bucket.date, {
      date: bucket.date,
      label: formatChartDate(bucket.date),
      votes: bucket.value,
      revenue: 0,
      events: 0,
    });
  }

  for (const bucket of series.revenue.buckets) {
    const existing = byDate.get(bucket.date) ?? {
      date: bucket.date,
      label: formatChartDate(bucket.date),
      votes: 0,
      revenue: 0,
      events: 0,
    };
    existing.revenue = bucket.value / 100;
    byDate.set(bucket.date, existing);
  }

  for (const bucket of series.events.buckets) {
    const existing = byDate.get(bucket.date) ?? {
      date: bucket.date,
      label: formatChartDate(bucket.date),
      votes: 0,
      revenue: 0,
      events: 0,
    };
    existing.events = bucket.value;
    byDate.set(bucket.date, existing);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildStatusRows(overview: OverviewMetrics | null) {
  const counts = new Map<string, number>();
  for (const item of overview?.eventsByStatus ?? []) counts.set(item.status, item.count);
  const total = safeMax(Array.from(counts.values()));

  return STATUS_ORDER.map((status) => ({
    status,
    label: formatStatus(status),
    count: counts.get(status) ?? 0,
    pct: ((counts.get(status) ?? 0) / total) * 100,
  }));
}

function formatChartDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date.slice(5);
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function KpiCard({
  label,
  value,
  subValue,
  delta,
}: {
  label: string;
  value: string;
  subValue: string;
  delta?: number | null;
}) {
  return (
    <article className="min-h-[116px] rounded-[1.25rem] border border-line bg-white p-4 shadow-[0_18px_42px_rgba(7,17,31,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-ink/45">{label}</p>
        {delta !== undefined ? <DeltaBadge value={delta} /> : null}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-xs font-medium text-ink/45">{subValue}</p>
    </article>
  );
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs font-semibold text-ink/35">new</span>;
  }

  const positive = value >= 0;
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
        positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-accent",
      ].join(" ")}
    >
      <span>{positive ? "↗" : "↘"}</span>
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-ink/60">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function DashboardTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number }>;
  label?: string;
  currency: string | null;
}) {
  if (!active || !payload?.length) return null;

  const votes = payload.find((p) => p.dataKey === "votes")?.value ?? 0;
  const revenue = payload.find((p) => p.dataKey === "revenue")?.value ?? 0;
  const events = payload.find((p) => p.dataKey === "events")?.value ?? 0;

  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_18px_45px_rgba(7,17,31,0.16)]">
      <p className="mb-2 text-xs font-semibold text-ink">{label}</p>
      <div className="space-y-1 text-xs text-ink/60">
        <p>Votes: <span className="font-semibold text-ink">{votes.toLocaleString()}</span></p>
        <p>Revenue: <span className="font-semibold text-ink">{formatMoney(revenue * 100, currency)}</span></p>
        <p>Events: <span className="font-semibold text-ink">{events.toLocaleString()}</span></p>
      </div>
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-line bg-[#f8fafc] text-sm font-medium text-ink/40">
      {label}
    </div>
  );
}

function TopEventsPanel({
  by,
  setBy,
  loading,
  rows,
}: {
  by: TopBy;
  setBy: (value: TopBy) => void;
  loading: boolean;
  rows: TopEventEntry[];
}) {
  const chartData = rows.map((row) => ({
    ...row,
    displayValue: by === "revenue" ? row.value / 100 : row.value,
  }));

  return (
    <section className="rounded-[1.5rem] border border-line bg-white p-5 shadow-[0_18px_45px_rgba(7,17,31,0.045)]">
      <PanelHeader title="Top events" by={by} setBy={setBy} />
      <div className="mt-4 h-[312px]">
        {loading && rows.length === 0 ? (
          <EmptyPanel label="Loading events..." />
        ) : rows.length === 0 ? (
          <EmptyPanel label="No event activity for this period" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#edf1f7" vertical={false} />
              <XAxis
                dataKey="eventName"
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={{ fontSize: 10, fill: "#718096" }}
                tickFormatter={(value: string) =>
                  value.length > 10 ? `${value.slice(0, 10)}...` : value
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#718096" }}
                width={42}
              />
              <Tooltip
                cursor={{ fill: "rgba(15,76,219,0.05)" }}
                contentStyle={{
                  border: "1px solid #d6deeb",
                  borderRadius: 16,
                  boxShadow: "0 18px 45px rgba(7,17,31,0.14)",
                }}
                formatter={(value, _name, item) => {
                  const payload = item?.payload as TopEventEntry | undefined;
                  if (by === "revenue") {
                    return [
                      formatMoney(Number(value) * 100, payload?.currency ?? null),
                      "Revenue",
                    ];
                  }
                  return [Number(value).toLocaleString(), "Votes"];
                }}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as TopEventEntry | undefined;
                  return row ? `${row.eventName} / ${formatStatus(row.eventStatus)}` : "";
                }}
              />
              <Bar dataKey="displayValue" radius={[8, 8, 0, 0]} maxBarSize={38}>
                {chartData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={EVENT_BAR_COLORS[index % EVENT_BAR_COLORS.length]}
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

function CategoryDonutPanel({
  by,
  setBy,
  loading,
  rows,
}: {
  by: TopBy;
  setBy: (value: TopBy) => void;
  loading: boolean;
  rows: Array<{
    id: string;
    name: string;
    eventName: string;
    value: number;
    rawValue: number;
    currency: string | null;
    color: string;
  }>;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <section className="rounded-[1.5rem] border border-line bg-white p-5 shadow-[0_18px_45px_rgba(7,17,31,0.045)]">
      <PanelHeader title="Category mix" by={by} setBy={setBy} />
      <div className="mt-4 grid min-h-[312px] gap-4 lg:grid-cols-[1fr_1.1fr]">
        {loading && rows.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyPanel label="Loading categories..." />
          </div>
        ) : rows.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyPanel label="No category activity for this period" />
          </div>
        ) : (
          <>
            <div className="relative h-[250px] lg:h-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rows}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={2}
                  >
                    {rows.map((row) => (
                      <Cell key={row.id} fill={row.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #d6deeb",
                      borderRadius: 16,
                      boxShadow: "0 18px 45px rgba(7,17,31,0.14)",
                    }}
                    formatter={(value, _name, item) => {
                      const row = item?.payload as (typeof rows)[number] | undefined;
                      if (by === "revenue") {
                        return [formatMoney(row?.rawValue ?? 0, row?.currency ?? null), "Revenue"];
                      }
                      return [Number(value).toLocaleString(), "Votes"];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-medium text-ink/40">Total</span>
                <span className="font-display text-2xl font-semibold text-ink">
                  {by === "revenue"
                    ? formatMoney(rows.reduce((sum, row) => sum + row.rawValue, 0), rows[0]?.currency ?? null)
                    : compactNumber(total)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {rows.map((row) => {
                const pct = total === 0 ? 0 : (row.value / total) * 100;
                return (
                  <div key={row.id} className="rounded-2xl border border-line/70 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                        <p className="truncate text-sm font-semibold text-ink">
                          {row.name}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-ink/50">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink/42">{row.eventName}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function PanelHeader({
  title,
  by,
  setBy,
}: {
  title: string;
  by: TopBy;
  setBy: (value: TopBy) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      <div className="flex w-fit gap-1 rounded-xl border border-line bg-[#f8fafc] p-1">
        {TOP_BY_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setBy(option.key)}
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              by === option.key
                ? "bg-ink text-white"
                : "text-ink/55 hover:bg-white hover:text-ink",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusPanel({
  rows,
}: {
  rows: Array<{ status: EventStatus; label: string; count: number; pct: number }>;
}) {
  return (
    <section className="rounded-[1.5rem] border border-line bg-white p-5 shadow-[0_18px_45px_rgba(7,17,31,0.045)]">
      <h2 className="font-display text-xl font-semibold text-ink">Event status</h2>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.status}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-ink/65">{row.label}</span>
              <span className="font-semibold text-ink">{row.count.toLocaleString()}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#eef2f7]">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(row.count > 0 ? 8 : 0, row.pct)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PendingPanel({ pending }: { pending: EventResponse[] }) {
  return (
    <section className="rounded-[1.5rem] border border-line bg-white p-5 shadow-[0_18px_45px_rgba(7,17,31,0.045)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Review queue</h2>
          <p className="mt-1 text-sm text-ink/45">
            {pending.length.toLocaleString()} event{pending.length === 1 ? "" : "s"} waiting.
          </p>
        </div>
        <Link
          href="/admin/events"
          className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-deep"
        >
          Review
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-[#f8fafc] px-4 py-8 text-center text-sm font-medium text-ink/40">
            No pending events.
          </div>
        ) : (
          pending.slice(0, 4).map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-line/80 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{event.name}</p>
                <p className="mt-1 text-xs text-ink/42">
                  {event.categories.length} categories / submitted{" "}
                  {event.submittedAt
                    ? new Date(event.submittedAt).toLocaleDateString()
                    : "date unknown"}
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                Pending
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
