import { apiRequest } from "./client";

export type PeriodKey = "7d" | "30d" | "90d" | "all";
export type TimeseriesMetric = "votes" | "revenue" | "events";
export type TopBy = "votes" | "revenue";

export type RevenueBucket = {
  currency: string;
  grossMinor: number;
  netMinor: number;
  feesMinor: number;
  successCount: number;
};

export type StatusCount = {
  status: string;
  count: number;
};

export type OverviewMetrics = {
  totals: {
    events: number;
    users: number;
    activeUsers: number;
    contestants: number;
  };
  period: {
    votes: number;
    paidVotes: number;
    freeVotes: number;
    uniqueVoters: number;
    newEvents: number;
    newUsers: number;
    revenueByCurrency: RevenueBucket[];
  };
  previousPeriod: {
    votes: number;
    newEvents: number;
    newUsers: number;
    revenueByCurrency: RevenueBucket[];
  } | null;
  eventsByStatus: StatusCount[];
  usersByStatus: StatusCount[];
};

export type TimeseriesBucket = { date: string; value: number };

export type TimeseriesResponse = {
  metric: TimeseriesMetric;
  currency: string | null;
  buckets: TimeseriesBucket[];
};

export type TopEventEntry = {
  eventId: string;
  eventName: string;
  eventStatus: string;
  value: number;
  currency: string | null;
};

export type TopCategoryEntry = {
  categoryId: string;
  categoryName: string;
  eventId: string;
  eventName: string;
  value: number;
  currency: string | null;
};

export function getAdminOverview(period: PeriodKey): Promise<OverviewMetrics> {
  return apiRequest<OverviewMetrics>(`/admin/metrics/overview?period=${period}`);
}

export function getAdminTimeseries(input: {
  metric: TimeseriesMetric;
  period: Exclude<PeriodKey, "all">;
}): Promise<TimeseriesResponse> {
  const qs = new URLSearchParams({ metric: input.metric, period: input.period });
  return apiRequest<TimeseriesResponse>(`/admin/metrics/timeseries?${qs.toString()}`);
}

export function getAdminTopEvents(input: {
  by: TopBy;
  period: PeriodKey;
  limit?: number;
}): Promise<TopEventEntry[]> {
  const qs = new URLSearchParams({ by: input.by, period: input.period });
  if (input.limit) qs.set("limit", String(input.limit));
  return apiRequest<TopEventEntry[]>(`/admin/metrics/top-events?${qs.toString()}`);
}

export function getAdminTopCategories(input: {
  by: TopBy;
  period: PeriodKey;
  limit?: number;
}): Promise<TopCategoryEntry[]> {
  const qs = new URLSearchParams({ by: input.by, period: input.period });
  if (input.limit) qs.set("limit", String(input.limit));
  return apiRequest<TopCategoryEntry[]>(`/admin/metrics/top-categories?${qs.toString()}`);
}
