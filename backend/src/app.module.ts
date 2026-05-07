import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { CoreModule } from "./core/core.module";
import { appConfig } from "./core/config/app.config";
import { authConfig } from "./core/config/auth.config";
import { databaseConfig } from "./core/config/database.config";
import { emailConfig } from "./core/config/email.config";
import { validationSchema } from "./core/config/env.validation";
import { paystackConfig } from "./core/config/paystack.config";
import { storageConfig } from "./core/config/storage.config";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AccessControlModule } from "./modules/access-control/access-control.module";
import { ContestantsModule } from "./modules/contestants/contestants.module";
import { EventsModule } from "./modules/events/events.module";
import { HealthModule } from "./modules/health/health.module";
import { NominationsModule } from "./modules/nominations/nominations.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SchedulingModule } from "./modules/scheduling/scheduling.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { UsersModule } from "./modules/users/users.module";
import { VotesModule } from "./modules/votes/votes.module";
import { AllExceptionsFilter } from "./shared/filters/all-exceptions.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, authConfig, databaseConfig, emailConfig, paystackConfig, storageConfig],
      validationSchema,
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        ".env.local",
        ".env",
      ],
    }),
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60_000, limit: 30 },
    ]),
    CoreModule,
    UsersModule,
    AuthModule,
    AccessControlModule,
    ContestantsModule,
    NotificationsModule,
    EventsModule,
    NominationsModule,
    UploadsModule,
    VotesModule,
    SchedulingModule,
    HealthModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
