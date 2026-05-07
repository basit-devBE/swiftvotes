import { Injectable } from "@nestjs/common";
import { Prisma, VoteStatus, PaymentStatus, UserStatus, EventStatus } from "@prisma/client";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import {
  AdminMetricsRepository,
  MetricPeriod,
  OverviewMetrics,
  RevenueBucket,
  StatusCount,
  TimeseriesMetric,
  TimeseriesMetrics,
  TopBy,
  TopCategoryEntry,
  TopEventEntry,
} from "../../application/ports/admin-metrics.repository";

const COUNTABLE_VOTE_STATUSES: VoteStatus[] = [VoteStatus.FREE, VoteStatus.CONFIRMED];

type DayBucketRow = {
  day: Date;
  value: bigint | number | null;
};

@Injectable()
export class PrismaAdminMetricsRepository implements AdminMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Overview ───────────────────────────────────────────────────────────

  async getOverview(period: MetricPeriod): Promise<OverviewMetrics> {
    const previous = previousPeriodOf(period);

    const [
      eventsTotal,
      usersTotal,
      activeUsersTotal,
      contestantsTotal,
      eventsByStatusRows,
      usersByStatusRows,
      voteAggregate,
      uniqueVotersRow,
      newEventsCount,
      newUsersCount,
      revenueRows,
      prevVoteAggregate,
      prevNewEventsCount,
      prevNewUsersCount,
      prevRevenueRows,
    ] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.contestant.count(),
      this.prisma.event.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.user.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.aggregateVotes(period),
      this.uniqueVoters(period),
      this.prisma.event.count({ where: this.createdInPeriodWhere(period) }),
      this.prisma.user.count({ where: this.createdInPeriodWhere(period) }),
      this.aggregateRevenue(period),
      previous ? this.aggregateVotes(previous) : Promise.resolve({ paid: 0, free: 0 }),
      previous ? this.prisma.event.count({ where: this.createdInPeriodWhere(previous) }) : Promise.resolve(0),
      previous ? this.prisma.user.count({ where: this.createdInPeriodWhere(previous) }) : Promise.resolve(0),
      previous ? this.aggregateRevenue(previous) : Promise.resolve([] as RevenueBucket[]),
    ]);

    const eventsByStatus: StatusCount<string>[] = eventsByStatusRows.map((r) => ({
      status: r.status as EventStatus,
      count: r._count._all,
    }));
    const usersByStatus: StatusCount<string>[] = usersByStatusRows.map((r) => ({
      status: r.status as UserStatus,
      count: r._count._all,
    }));

    return {
      totals: {
        events: eventsTotal,
        users: usersTotal,
        activeUsers: activeUsersTotal,
        contestants: contestantsTotal,
      },
      period: {
        votes: voteAggregate.paid + voteAggregate.free,
        paidVotes: voteAggregate.paid,
        freeVotes: voteAggregate.free,
        uniqueVoters: uniqueVotersRow,
        newEvents: newEventsCount,
        newUsers: newUsersCount,
        revenueByCurrency: revenueRows,
      },
      previousPeriod: previous
        ? {
            votes: prevVoteAggregate.paid + prevVoteAggregate.free,
            newEvents: prevNewEventsCount,
            newUsers: prevNewUsersCount,
            revenueByCurrency: prevRevenueRows,
          }
        : null,
      eventsByStatus,
      usersByStatus,
    };
  }

  // ── Time-series ────────────────────────────────────────────────────────

  async getTimeseries(input: {
    metric: TimeseriesMetric;
    period: MetricPeriod;
  }): Promise<TimeseriesMetrics> {
    const { metric, period } = input;
    if (period.since === null) {
      // guarded by use case; defensive fallback returns empty series
      return { metric, currency: null, buckets: [] };
    }

    let rows: DayBucketRow[] = [];
    let currency: string | null = null;

    if (metric === "votes") {
      rows = await this.prisma.$queryRaw<DayBucketRow[]>`
        SELECT date_trunc('day', "createdAt") AS day,
               COALESCE(SUM(quantity), 0)::bigint AS value
        FROM "Vote"
        WHERE "createdAt" >= ${period.since}
          AND "createdAt" <= ${period.until}
          AND status IN ('FREE', 'CONFIRMED')
        GROUP BY day
        ORDER BY day ASC
      `;
    } else if (metric === "events") {
      rows = await this.prisma.$queryRaw<DayBucketRow[]>`
        SELECT date_trunc('day', "createdAt") AS day,
               COUNT(*)::bigint AS value
        FROM "Event"
        WHERE "createdAt" >= ${period.since}
          AND "createdAt" <= ${period.until}
        GROUP BY day
        ORDER BY day ASC
      `;
    } else {
      // revenue — use the dominant currency (most successful payments) for the series
      const dominant = await this.prisma.payment.groupBy({
        by: ["currency"],
        where: {
          status: PaymentStatus.SUCCEEDED,
          paidAt: { gte: period.since, lte: period.until },
        },
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 1,
      });
      currency = dominant[0]?.currency ?? null;

      if (currency) {
        rows = await this.prisma.$queryRaw<DayBucketRow[]>`
          SELECT date_trunc('day', "paidAt") AS day,
                 COALESCE(SUM("amountPaidMinor"), 0)::bigint AS value
          FROM "Payment"
          WHERE status = 'SUCCEEDED'
            AND "paidAt" IS NOT NULL
            AND "paidAt" >= ${period.since}
            AND "paidAt" <= ${period.until}
            AND currency = ${currency}
          GROUP BY day
          ORDER BY day ASC
        `;
      }
    }

    const filled = fillDailyBuckets(period.since, period.until, rows);
    return { metric, currency, buckets: filled };
  }

  // ── Top events ─────────────────────────────────────────────────────────

  async getTopEvents(input: {
    by: TopBy;
    period: MetricPeriod;
    limit: number;
  }): Promise<TopEventEntry[]> {
    const { by, period, limit } = input;

    if (by === "votes") {
      const sinceFilter = period.since
        ? Prisma.sql`AND v."createdAt" >= ${period.since}`
        : Prisma.empty;
      const rows = await this.prisma.$queryRaw<
        {
          eventId: string;
          eventName: string;
          eventStatus: string;
          value: bigint | number | null;
        }[]
      >`
        SELECT v."eventId" AS "eventId",
               e.name AS "eventName",
               e.status::text AS "eventStatus",
               COALESCE(SUM(v.quantity), 0)::bigint AS value
        FROM "Vote" v
        JOIN "Event" e ON e.id = v."eventId"
        WHERE v.status IN ('FREE', 'CONFIRMED')
          AND v."createdAt" <= ${period.until}
          ${sinceFilter}
        GROUP BY v."eventId", e.name, e.status
        ORDER BY value DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({
        eventId: r.eventId,
        eventName: r.eventName,
        eventStatus: r.eventStatus,
        value: Number(r.value ?? 0),
        currency: null,
      }));
    }

    const sinceFilter = period.since
      ? Prisma.sql`AND p."paidAt" >= ${period.since}`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      {
        eventId: string;
        eventName: string;
        eventStatus: string;
        currency: string;
        value: bigint | number | null;
      }[]
    >`
      SELECT p."eventId" AS "eventId",
             e.name AS "eventName",
             e.status::text AS "eventStatus",
             p.currency AS currency,
             COALESCE(SUM(p."amountPaidMinor"), 0)::bigint AS value
      FROM "Payment" p
      JOIN "Event" e ON e.id = p."eventId"
      WHERE p.status = 'SUCCEEDED'
        AND p."paidAt" IS NOT NULL
        AND p."paidAt" <= ${period.until}
        ${sinceFilter}
      GROUP BY p."eventId", e.name, e.status, p.currency
      ORDER BY value DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      eventId: r.eventId,
      eventName: r.eventName,
      eventStatus: r.eventStatus,
      value: Number(r.value ?? 0),
      currency: r.currency,
    }));
  }

  // ── Top categories ─────────────────────────────────────────────────────

  async getTopCategories(input: {
    by: TopBy;
    period: MetricPeriod;
    limit: number;
  }): Promise<TopCategoryEntry[]> {
    const { by, period, limit } = input;

    if (by === "votes") {
      const sinceFilter = period.since
        ? Prisma.sql`AND v."createdAt" >= ${period.since}`
        : Prisma.empty;
      const rows = await this.prisma.$queryRaw<
        {
          categoryId: string;
          categoryName: string;
          eventId: string;
          eventName: string;
          value: bigint | number | null;
        }[]
      >`
        SELECT v."categoryId" AS "categoryId",
               c.name AS "categoryName",
               e.id AS "eventId",
               e.name AS "eventName",
               COALESCE(SUM(v.quantity), 0)::bigint AS value
        FROM "Vote" v
        JOIN "EventCategory" c ON c.id = v."categoryId"
        JOIN "Event" e ON e.id = v."eventId"
        WHERE v.status IN ('FREE', 'CONFIRMED')
          AND v."createdAt" <= ${period.until}
          ${sinceFilter}
        GROUP BY v."categoryId", c.name, e.id, e.name
        ORDER BY value DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        eventId: r.eventId,
        eventName: r.eventName,
        value: Number(r.value ?? 0),
        currency: null,
      }));
    }

    const sinceFilter = period.since
      ? Prisma.sql`AND p."paidAt" >= ${period.since}`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      {
        categoryId: string;
        categoryName: string;
        eventId: string;
        eventName: string;
        currency: string;
        value: bigint | number | null;
      }[]
    >`
      SELECT p."categoryId" AS "categoryId",
             c.name AS "categoryName",
             e.id AS "eventId",
             e.name AS "eventName",
             p.currency AS currency,
             COALESCE(SUM(p."amountPaidMinor"), 0)::bigint AS value
      FROM "Payment" p
      JOIN "EventCategory" c ON c.id = p."categoryId"
      JOIN "Event" e ON e.id = p."eventId"
      WHERE p.status = 'SUCCEEDED'
        AND p."paidAt" IS NOT NULL
        AND p."paidAt" <= ${period.until}
        ${sinceFilter}
      GROUP BY p."categoryId", c.name, e.id, e.name, p.currency
      ORDER BY value DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      eventId: r.eventId,
      eventName: r.eventName,
      value: Number(r.value ?? 0),
      currency: r.currency,
    }));
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private createdInPeriodWhere(period: MetricPeriod): { createdAt: { gte?: Date; lte: Date } } {
    return {
      createdAt: {
        ...(period.since ? { gte: period.since } : {}),
        lte: period.until,
      },
    };
  }

  private async aggregateVotes(period: MetricPeriod): Promise<{ paid: number; free: number }> {
    const rows = await this.prisma.vote.groupBy({
      by: ["status"],
      where: {
        status: { in: COUNTABLE_VOTE_STATUSES },
        createdAt: {
          ...(period.since ? { gte: period.since } : {}),
          lte: period.until,
        },
      },
      _sum: { quantity: true },
    });
    let paid = 0;
    let free = 0;
    for (const r of rows) {
      const q = r._sum.quantity ?? 0;
      if (r.status === VoteStatus.CONFIRMED) paid += q;
      else if (r.status === VoteStatus.FREE) free += q;
    }
    return { paid, free };
  }

  private async uniqueVoters(period: MetricPeriod): Promise<number> {
    const rows = await this.prisma.vote.findMany({
      where: {
        status: { in: COUNTABLE_VOTE_STATUSES },
        createdAt: {
          ...(period.since ? { gte: period.since } : {}),
          lte: period.until,
        },
      },
      distinct: ["voterEmail"],
      select: { voterEmail: true },
    });
    return rows.length;
  }

  private async aggregateRevenue(period: MetricPeriod): Promise<RevenueBucket[]> {
    const rows = await this.prisma.payment.groupBy({
      by: ["currency"],
      where: {
        status: PaymentStatus.SUCCEEDED,
        paidAt: {
          ...(period.since ? { gte: period.since } : {}),
          lte: period.until,
        },
      },
      _sum: { amountPaidMinor: true, feeMinor: true },
      _count: { _all: true },
    });
    return rows.map((r) => {
      const gross = r._sum.amountPaidMinor ?? 0;
      const fees = r._sum.feeMinor ?? 0;
      return {
        currency: r.currency,
        grossMinor: gross,
        netMinor: gross - fees,
        feesMinor: fees,
        successCount: r._count._all,
      };
    });
  }
}

function previousPeriodOf(period: MetricPeriod): MetricPeriod | null {
  if (period.since === null) return null;
  const length = period.until.getTime() - period.since.getTime();
  return {
    since: new Date(period.since.getTime() - length),
    until: period.since,
  };
}

function fillDailyBuckets(
  since: Date,
  until: Date,
  rows: DayBucketRow[],
): { date: string; value: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.day);
    const key = ymd(d);
    map.set(key, Number(r.value ?? 0));
  }
  const out: { date: string; value: number }[] = [];
  const start = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate()));
  const end = new Date(Date.UTC(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate()));
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = ymd(d);
    out.push({ date: key, value: map.get(key) ?? 0 });
  }
  return out;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
