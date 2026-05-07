export type MetricPeriod = {
  since: Date | null;
  until: Date;
};

export type RevenueBucket = {
  currency: string;
  grossMinor: number;
  netMinor: number;
  feesMinor: number;
  successCount: number;
};

export type StatusCount<T extends string> = {
  status: T;
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
  eventsByStatus: StatusCount<string>[];
  usersByStatus: StatusCount<string>[];
};

export type TimeseriesMetric = "votes" | "revenue" | "events";

export type TimeseriesBucket = {
  date: string;
  value: number;
};

export type TimeseriesMetrics = {
  metric: TimeseriesMetric;
  currency: string | null;
  buckets: TimeseriesBucket[];
};

export type TopBy = "votes" | "revenue";

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

export interface AdminMetricsRepository {
  getOverview(period: MetricPeriod): Promise<OverviewMetrics>;
  getTimeseries(input: {
    metric: TimeseriesMetric;
    period: MetricPeriod;
  }): Promise<TimeseriesMetrics>;
  getTopEvents(input: {
    by: TopBy;
    period: MetricPeriod;
    limit: number;
  }): Promise<TopEventEntry[]>;
  getTopCategories(input: {
    by: TopBy;
    period: MetricPeriod;
    limit: number;
  }): Promise<TopCategoryEntry[]>;
}
