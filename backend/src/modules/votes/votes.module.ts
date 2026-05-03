import { forwardRef, Module } from "@nestjs/common";

import { ContestantsModule } from "../contestants/contestants.module";
import { EventsModule } from "../events/events.module";
import { CastVoteUseCase } from "./application/use-cases/cast-vote.use-case";
import { GetLeaderboardUseCase } from "./application/use-cases/get-leaderboard.use-case";
import { VOTES_REPOSITORY } from "./application/votes.tokens";
import { PrismaVotesRepository } from "./infrastructure/persistence/prisma-votes.repository";
import { VotesController } from "./presentation/http/votes.controller";

@Module({
  imports: [EventsModule, forwardRef(() => ContestantsModule)],
  controllers: [VotesController],
  providers: [
    CastVoteUseCase,
    GetLeaderboardUseCase,
    {
      provide: VOTES_REPOSITORY,
      useClass: PrismaVotesRepository,
    },
  ],
  exports: [VOTES_REPOSITORY],
})
export class VotesModule {}
