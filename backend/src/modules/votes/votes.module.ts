import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { appConfig } from "../../core/config/app.config";
import { paystackConfig } from "../../core/config/paystack.config";
import { ContestantsModule } from "../contestants/contestants.module";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CastVoteUseCase } from "./application/use-cases/cast-vote.use-case";
import { ConfirmVoteUseCase } from "./application/use-cases/confirm-vote.use-case";
import { GetEventVotesSummaryUseCase } from "./application/use-cases/get-event-votes-summary.use-case";
import { GetLeaderboardUseCase } from "./application/use-cases/get-leaderboard.use-case";
import { GetPaymentDetailUseCase } from "./application/use-cases/get-payment-detail.use-case";
import { HandlePaystackWebhookUseCase } from "./application/use-cases/handle-paystack-webhook.use-case";
import { ListEventPaymentsUseCase } from "./application/use-cases/list-event-payments.use-case";
import { PAYMENTS_REPOSITORY, VOTES_REPOSITORY } from "./application/votes.tokens";
import { PaystackService } from "./infrastructure/payments/paystack.service";
import { PrismaPaymentsRepository } from "./infrastructure/persistence/prisma-payments.repository";
import { PrismaVotesRepository } from "./infrastructure/persistence/prisma-votes.repository";
import { PaymentsController } from "./presentation/http/payments.controller";
import { VotesController } from "./presentation/http/votes.controller";
import { PaymentWebhooksController } from "./presentation/http/webhooks.controller";

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    ConfigModule.forFeature(paystackConfig),
    EventsModule,
    NotificationsModule,
    forwardRef(() => ContestantsModule),
  ],
  controllers: [VotesController, PaymentWebhooksController, PaymentsController],
  providers: [
    CastVoteUseCase,
    ConfirmVoteUseCase,
    GetLeaderboardUseCase,
    HandlePaystackWebhookUseCase,
    ListEventPaymentsUseCase,
    GetPaymentDetailUseCase,
    GetEventVotesSummaryUseCase,
    PaystackService,
    {
      provide: VOTES_REPOSITORY,
      useClass: PrismaVotesRepository,
    },
    {
      provide: PAYMENTS_REPOSITORY,
      useClass: PrismaPaymentsRepository,
    },
  ],
  exports: [VOTES_REPOSITORY, PAYMENTS_REPOSITORY],
})
export class VotesModule {}
