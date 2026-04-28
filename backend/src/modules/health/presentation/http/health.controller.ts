import { Controller, Get } from "@nestjs/common";

import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { GetHealthUseCase } from "../../application/use-cases/get-health.use-case";
import { HealthStatus } from "../../domain/health-status";

@Controller({
  path: "system",
  version: "1",
})
export class HealthController {
  constructor(private readonly getHealthUseCase: GetHealthUseCase) {}

  @Public()
  @Get("health")
  getHealth(): HealthStatus {
    return this.getHealthUseCase.execute();
  }
}
