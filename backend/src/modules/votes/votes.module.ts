import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { appConfig } from "../../core/config/app.config";
import { paystackConfig } from "../../core/config/paystack.config";
import { ContestantsModule } from "../contestants/contestants.module";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CastVoteUseCase } from "./application/use-cases/cast-vote.use-case";
import { ConfirmVoteUseCase } from "./application/use-cases/confirm-vote.use-case";
import { GetLeaderboardUseCase } from "./application/use-cases/get-leaderboard.use-case";
import { HandlePaystackWebhookUseCase } from "./application/use-cases/handle-paystack-webhook.use-case";
import { VOTES_REPOSITORY } from "./application/votes.tokens";
import { PaystackService } from "./infrastructure/payments/paystack.service";
import { PrismaVotesRepository } from "./infrastructure/persistence/prisma-votes.repository";
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
  controllers: [VotesController, PaymentWebhooksController],
  providers: [
    CastVoteUseCase,
    ConfirmVoteUseCase,
    GetLeaderboardUseCase,
    HandlePaystackWebhookUseCase,
    PaystackService,
    {
      provide: VOTES_REPOSITORY,
      useClass: PrismaVotesRepository,
    },
  ],
  exports: [VOTES_REPOSITORY],
})
export class VotesModule {}
