import {
  OverviewMetrics,
  TimeseriesMetrics,
  TopCategoryEntry,
  TopEventEntry,
} from "../../../application/ports/admin-metrics.repository";

export class RevenueBucketDto {
  currency!: string;
  grossMinor!: number;
  netMinor!: number;
  feesMinor!: number;
  successCount!: number;
}

export class StatusCountDto {
  status!: string;
  count!: number;
}

export class OverviewMetricsResponseDto {
  totals!: {
    events: number;
    users: number;
    activeUsers: number;
    contestants: number;
  };
  period!: {
    votes: number;
    paidVotes: number;
    freeVotes: number;
    uniqueVoters: number;
    newEvents: number;
    newUsers: number;
    revenueByCurrency: RevenueBucketDto[];
  };
  previousPeriod!: {
    votes: number;
    newEvents: number;
    newUsers: number;
    revenueByCurrency: RevenueBucketDto[];
  } | null;
  eventsByStatus!: StatusCountDto[];
  usersByStatus!: StatusCountDto[];

  static fromDomain(m: OverviewMetrics): OverviewMetricsResponseDto {
    return {
      totals: m.totals,
      period: m.period,
      previousPeriod: m.previousPeriod,
      eventsByStatus: m.eventsByStatus,
      usersByStatus: m.usersByStatus,
    };
  }
}

export class TimeseriesBucketDto {
  date!: string;
  value!: number;
}

export class TimeseriesResponseDto {
  metric!: "votes" | "revenue" | "events";
  currency!: string | null;
  buckets!: TimeseriesBucketDto[];

  static fromDomain(m: TimeseriesMetrics): TimeseriesResponseDto {
    return { metric: m.metric, currency: m.currency, buckets: m.buckets };
  }
}

export class TopEventResponseDto {
  eventId!: string;
  eventName!: string;
  eventStatus!: string;
  value!: number;
  currency!: string | null;

  static fromDomain(e: TopEventEntry): TopEventResponseDto {
    return e;
  }
}

export class TopCategoryResponseDto {
  categoryId!: string;
  categoryName!: string;
  eventId!: string;
  eventName!: string;
  value!: number;
  currency!: string | null;

  static fromDomain(c: TopCategoryEntry): TopCategoryResponseDto {
    return c;
  }
}
