import { Module } from "@nestjs/common";

import { NOTIFICATIONS_SERVICE } from "./application/notifications.tokens";
import { AppLoggerNotificationsService } from "./infrastructure/logging/app-logger-notifications.service";

@Module({
  providers: [
    {
      provide: NOTIFICATIONS_SERVICE,
      useClass: AppLoggerNotificationsService,
    },
  ],
  exports: [NOTIFICATIONS_SERVICE],
})
export class NotificationsModule {}
