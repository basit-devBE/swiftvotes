import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { ConfirmPhoneVerificationUseCase } from "./application/use-cases/confirm-phone-verification.use-case";
import { StartPhoneVerificationUseCase } from "./application/use-cases/start-phone-verification.use-case";
import { PhoneVerificationsController } from "./presentation/http/phone-verifications.controller";

@Module({
  imports: [NotificationsModule],
  controllers: [PhoneVerificationsController],
  providers: [StartPhoneVerificationUseCase, ConfirmPhoneVerificationUseCase],
})
export class PhoneVerificationsModule {}
