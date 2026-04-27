import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { appConfig } from "../../core/config/app.config";
import { GetHealthUseCase } from "./application/use-cases/get-health.use-case";
import { HealthController } from "./presentation/http/health.controller";

@Module({
  imports: [ConfigModule.forFeature(appConfig)],
  controllers: [HealthController],
  providers: [GetHealthUseCase],
})
export class HealthModule {}
