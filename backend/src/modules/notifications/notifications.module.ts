import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { smsConfig } from "../../core/config/sms.config";
import { NOTIFICATIONS_SERVICE } from "./application/notifications.tokens";
import { NodemailerNotificationsService } from "./infrastructure/email/nodemailer-notifications.service";
import { ArkeselSmsService } from "./infrastructure/sms/arkesel-sms.service";

@Module({
  imports: [ConfigModule.forFeature(smsConfig)],
  providers: [
    ArkeselSmsService,
    {
      provide: NOTIFICATIONS_SERVICE,
      useClass: NodemailerNotificationsService,
    },
  ],
  exports: [NOTIFICATIONS_SERVICE, ArkeselSmsService],
})
export class NotificationsModule {}
