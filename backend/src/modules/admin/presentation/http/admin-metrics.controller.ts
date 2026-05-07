import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from "@nestjs/common";

import { SystemRoles } from "../../../auth/presentation/http/decorators/system-roles.decorator";
import { SystemRole } from "../../../users/domain/system-role";
import { parsePeriod, PeriodKey } from "../../application/period";
import {
  TimeseriesMetric,
  TopBy,
} from "../../application/ports/admin-metrics.repository";
import { GetOverviewMetricsUseCase } from "../../application/use-cases/get-overview-metrics.use-case";
import { GetTimeseriesMetricsUseCase } from "../../application/use-cases/get-timeseries-metrics.use-case";
import { GetTopCategoriesUseCase } from "../../application/use-cases/get-top-categories.use-case";
import { GetTopEventsUseCase } from "../../application/use-cases/get-top-events.use-case";
import {
  OverviewMetricsResponseDto,
  TimeseriesResponseDto,
  TopCategoryResponseDto,
  TopEventResponseDto,
} from "./responses/admin-metrics.response.dto";

const TIMESERIES_METRICS: TimeseriesMetric[] = ["votes", "revenue", "events"];
const TOP_BYS: TopBy[] = ["votes", "revenue"];

@Controller("admin/metrics")
@SystemRoles(SystemRole.SUPER_ADMIN)
export class AdminMetricsController {
  constructor(
    private readonly getOverview: GetOverviewMetricsUseCase,
    private readonly getTimeseries: GetTimeseriesMetricsUseCase,
    private readonly getTopEvents: GetTopEventsUseCase,
    private readonly getTopCategories: GetTopCategoriesUseCase,
  ) {}

  @Get("overview")
  async overview(
    @Query("period") period?: string,
  ): Promise<OverviewMetricsResponseDto> {
    const periodKey: PeriodKey = parsePeriod(period);
    const result = await this.getOverview.execute(periodKey);
    return OverviewMetricsResponseDto.fromDomain(result);
  }

  @Get("timeseries")
  async timeseries(
    @Query("metric") metric: string,
    @Query("period") period?: string,
  ): Promise<TimeseriesResponseDto> {
    if (!TIMESERIES_METRICS.includes(metric as TimeseriesMetric)) {
      throw new BadRequestException(
        `Invalid metric. Allowed: ${TIMESERIES_METRICS.join(", ")}`,
      );
    }
    const periodKey: PeriodKey = parsePeriod(period);
    const result = await this.getTimeseries.execute({
      metric: metric as TimeseriesMetric,
      periodKey,
    });
    return TimeseriesResponseDto.fromDomain(result);
  }

  @Get("top-events")
  async topEvents(
    @Query("by") by: string,
    @Query("period") period: string | undefined,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<TopEventResponseDto[]> {
    if (!TOP_BYS.includes(by as TopBy)) {
      throw new BadRequestException(
        `Invalid 'by'. Allowed: ${TOP_BYS.join(", ")}`,
      );
    }
    const periodKey: PeriodKey = parsePeriod(period);
    const result = await this.getTopEvents.execute({
      by: by as TopBy,
      periodKey,
      limit: clamp(limit, 1, 50),
    });
    return result.map((r) => TopEventResponseDto.fromDomain(r));
  }

  @Get("top-categories")
  async topCategories(
    @Query("by") by: string,
    @Query("period") period: string | undefined,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<TopCategoryResponseDto[]> {
    if (!TOP_BYS.includes(by as TopBy)) {
      throw new BadRequestException(
        `Invalid 'by'. Allowed: ${TOP_BYS.join(", ")}`,
      );
    }
    const periodKey: PeriodKey = parsePeriod(period);
    const result = await this.getTopCategories.execute({
      by: by as TopBy,
      periodKey,
      limit: clamp(limit, 1, 50),
    });
    return result.map((r) => TopCategoryResponseDto.fromDomain(r));
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
