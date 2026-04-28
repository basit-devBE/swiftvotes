import { Module } from "@nestjs/common";

import { NOTIFICATIONS_SERVICE } from "./application/notifications.tokens";
import { NodemailerNotificationsService } from "./infrastructure/email/nodemailer-notifications.service";

@Module({
  providers: [
    {
      provide: NOTIFICATIONS_SERVICE,
      useClass: NodemailerNotificationsService,
    },
  ],
  exports: [NOTIFICATIONS_SERVICE],
})
export class NotificationsModule {}
