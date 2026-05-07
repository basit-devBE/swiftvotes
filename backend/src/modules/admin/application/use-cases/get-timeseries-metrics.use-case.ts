import { BadRequestException, Inject, Injectable } from "@nestjs/common";

import { ADMIN_METRICS_REPOSITORY } from "../admin.tokens";
import { periodToRange, PeriodKey } from "../period";
import {
  AdminMetricsRepository,
  TimeseriesMetric,
  TimeseriesMetrics,
} from "../ports/admin-metrics.repository";

@Injectable()
export class GetTimeseriesMetricsUseCase {
  constructor(
    @Inject(ADMIN_METRICS_REPOSITORY)
    private readonly repo: AdminMetricsRepository,
  ) {}

  async execute(input: {
    metric: TimeseriesMetric;
    periodKey: PeriodKey;
  }): Promise<TimeseriesMetrics> {
    if (input.periodKey === "all") {
      throw new BadRequestException(
        "Time-series does not support period=all. Use 7d, 30d, or 90d.",
      );
    }
    return this.repo.getTimeseries({
      metric: input.metric,
      period: periodToRange(input.periodKey),
    });
  }
}
