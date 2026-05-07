import { Module } from "@nestjs/common";

import { ADMIN_METRICS_REPOSITORY } from "./application/admin.tokens";
import { GetOverviewMetricsUseCase } from "./application/use-cases/get-overview-metrics.use-case";
import { GetTimeseriesMetricsUseCase } from "./application/use-cases/get-timeseries-metrics.use-case";
import { GetTopCategoriesUseCase } from "./application/use-cases/get-top-categories.use-case";
import { GetTopEventsUseCase } from "./application/use-cases/get-top-events.use-case";
import { PrismaAdminMetricsRepository } from "./infrastructure/persistence/prisma-admin-metrics.repository";
import { AdminMetricsController } from "./presentation/http/admin-metrics.controller";

@Module({
  controllers: [AdminMetricsController],
  providers: [
    GetOverviewMetricsUseCase,
    GetTimeseriesMetricsUseCase,
    GetTopEventsUseCase,
    GetTopCategoriesUseCase,
    {
      provide: ADMIN_METRICS_REPOSITORY,
      useClass: PrismaAdminMetricsRepository,
    },
  ],
})
export class AdminModule {}
