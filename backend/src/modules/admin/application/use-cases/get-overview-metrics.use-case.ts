import { Inject, Injectable } from "@nestjs/common";

import { ADMIN_METRICS_REPOSITORY } from "../admin.tokens";
import { periodToRange, PeriodKey } from "../period";
import {
  AdminMetricsRepository,
  OverviewMetrics,
} from "../ports/admin-metrics.repository";

@Injectable()
export class GetOverviewMetricsUseCase {
  constructor(
    @Inject(ADMIN_METRICS_REPOSITORY)
    private readonly repo: AdminMetricsRepository,
  ) {}

  async execute(periodKey: PeriodKey): Promise<OverviewMetrics> {
    return this.repo.getOverview(periodToRange(periodKey));
  }
}
