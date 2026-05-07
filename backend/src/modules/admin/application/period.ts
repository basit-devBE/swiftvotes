import { BadRequestException } from "@nestjs/common";

import { MetricPeriod } from "./ports/admin-metrics.repository";

export type PeriodKey = "7d" | "30d" | "90d" | "all";

export const PERIOD_KEYS: PeriodKey[] = ["7d", "30d", "90d", "all"];

export function parsePeriod(value: string | undefined, fallback: PeriodKey = "30d"): PeriodKey {
  const v = (value ?? fallback) as PeriodKey;
  if (!PERIOD_KEYS.includes(v)) {
    throw new BadRequestException(`Invalid period. Allowed: ${PERIOD_KEYS.join(", ")}`);
  }
  return v;
}

export function periodToRange(key: PeriodKey, now: Date = new Date()): MetricPeriod {
  if (key === "all") return { since: null, until: now };
  const days = key === "7d" ? 7 : key === "30d" ? 30 : 90;
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { since, until: now };
}

export function previousPeriodOf(period: MetricPeriod): MetricPeriod | null {
  if (period.since === null) return null;
  const length = period.until.getTime() - period.since.getTime();
  return {
    since: new Date(period.since.getTime() - length),
    until: period.since,
  };
}
