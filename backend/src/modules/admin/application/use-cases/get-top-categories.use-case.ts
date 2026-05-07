import { Inject, Injectable } from "@nestjs/common";

import { ADMIN_METRICS_REPOSITORY } from "../admin.tokens";
import { periodToRange, PeriodKey } from "../period";
import {
  AdminMetricsRepository,
  TopBy,
  TopCategoryEntry,
} from "../ports/admin-metrics.repository";

@Injectable()
export class GetTopCategoriesUseCase {
  constructor(
    @Inject(ADMIN_METRICS_REPOSITORY)
    private readonly repo: AdminMetricsRepository,
  ) {}

  async execute(input: {
    by: TopBy;
    periodKey: PeriodKey;
    limit: number;
  }): Promise<TopCategoryEntry[]> {
    return this.repo.getTopCategories({
      by: input.by,
      period: periodToRange(input.periodKey),
      limit: input.limit,
    });
  }
}
