import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import { appConfig } from "../../../../core/config/app.config";
import { HealthStatus } from "../../domain/health-status";

@Injectable()
export class GetHealthUseCase {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  execute(): HealthStatus {
    return {
      status: "ok",
      service: this.config.name,
      version: this.config.version,
      environment: this.config.environment,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
