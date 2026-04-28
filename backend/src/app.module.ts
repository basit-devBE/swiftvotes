import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";

import { CoreModule } from "./core/core.module";
import { appConfig } from "./core/config/app.config";
import { authConfig } from "./core/config/auth.config";
import { databaseConfig } from "./core/config/database.config";
import { emailConfig } from "./core/config/email.config";
import { validationSchema } from "./core/config/env.validation";
import { storageConfig } from "./core/config/storage.config";
import { AuthModule } from "./modules/auth/auth.module";
import { AccessControlModule } from "./modules/access-control/access-control.module";
import { EventsModule } from "./modules/events/events.module";
import { HealthModule } from "./modules/health/health.module";
import { NominationsModule } from "./modules/nominations/nominations.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SchedulingModule } from "./modules/scheduling/scheduling.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { UsersModule } from "./modules/users/users.module";
import { AllExceptionsFilter } from "./shared/filters/all-exceptions.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, authConfig, databaseConfig, emailConfig, storageConfig],
      validationSchema,
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        ".env.local",
        ".env",
      ],
    }),
    CoreModule,
    UsersModule,
    AuthModule,
    AccessControlModule,
    NotificationsModule,
    EventsModule,
    NominationsModule,
    UploadsModule,
    SchedulingModule,
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
