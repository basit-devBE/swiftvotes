import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { appConfig } from "../../core/config/app.config";
import { EventsModule } from "../events/events.module";
import { JunipayModule } from "../junipay/junipay.module";
import { PhoneVerificationsModule } from "../phone-verifications/phone-verifications.module";
import { VotesModule } from "../votes/votes.module";
import { ConfirmTicketOrderUseCase } from "./application/use-cases/confirm-ticket-order.use-case";
import { CreateTicketOrderUseCase } from "./application/use-cases/create-ticket-order.use-case";
import { CreateTicketTypeUseCase } from "./application/use-cases/create-ticket-type.use-case";
import { DisableTicketTypeUseCase } from "./application/use-cases/disable-ticket-type.use-case";
import { HandleTicketPaymentWebhookUseCase } from "./application/use-cases/handle-ticket-payment-webhook.use-case";
import { ListTicketTypesUseCase } from "./application/use-cases/list-ticket-types.use-case";
import { UpdateTicketTypeUseCase } from "./application/use-cases/update-ticket-type.use-case";
import { TICKETING_REPOSITORY } from "./application/ticketing.tokens";
import { PrismaTicketingRepository } from "./infrastructure/persistence/prisma-ticketing.repository";
import { TicketPaymentWebhooksController } from "./presentation/http/ticket-payment-webhooks.controller";
import { JunipayWebhooksController } from "./presentation/http/junipay-webhooks.controller";
import { TicketingController } from "./presentation/http/ticketing.controller";

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    EventsModule,
    VotesModule,
    JunipayModule,
    PhoneVerificationsModule,
  ],
  controllers: [
    TicketingController,
    TicketPaymentWebhooksController,
    JunipayWebhooksController,
  ],
  providers: [
    CreateTicketTypeUseCase,
    UpdateTicketTypeUseCase,
    DisableTicketTypeUseCase,
    ListTicketTypesUseCase,
    CreateTicketOrderUseCase,
    ConfirmTicketOrderUseCase,
    HandleTicketPaymentWebhookUseCase,
    {
      provide: TICKETING_REPOSITORY,
      useClass: PrismaTicketingRepository,
    },
  ],
  exports: [TICKETING_REPOSITORY],
})
export class TicketingModule {}
