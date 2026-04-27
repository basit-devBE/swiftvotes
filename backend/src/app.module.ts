import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";

import { CoreModule } from "./core/core.module";
import { appConfig } from "./core/config/app.config";
import { validationSchema } from "./core/config/env.validation";
import { HealthModule } from "./modules/health/health.module";
import { AllExceptionsFilter } from "./shared/filters/all-exceptions.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      validationSchema,
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        ".env.local",
        ".env",
      ],
    }),
    CoreModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
