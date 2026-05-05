import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { appConfig } from "../../core/config/app.config";
import { AuthModule } from "../auth/auth.module";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";
import { VotesModule } from "../votes/votes.module";
import { CONTESTANTS_REPOSITORY } from "./application/contestants.tokens";
import { GetContestantCredentialsUseCase } from "./application/use-cases/get-contestant-credentials.use-case";
import { GetContestantUseCase } from "./application/use-cases/get-contestant.use-case";
import { GetMyContestantProfileUseCase } from "./application/use-cases/get-my-contestant-profile.use-case";
import { GetMyContestantProfilesUseCase } from "./application/use-cases/get-my-contestant-profiles.use-case";
import { ListContestantsUseCase } from "./application/use-cases/list-contestants.use-case";
import { ProvisionContestantAccountUseCase } from "./application/use-cases/provision-contestant-account.use-case";
import { RegenerateMagicLinkUseCase } from "./application/use-cases/regenerate-magic-link.use-case";
import { UpdateContestantUseCase } from "./application/use-cases/update-contestant.use-case";
import { PrismaContestantsRepository } from "./infrastructure/persistence/prisma-contestants.repository";
import { ContestantsController } from "./presentation/http/contestants.controller";
import { MyContestantController } from "./presentation/http/my-contestant.controller";

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    AuthModule,
    EventsModule,
    UsersModule,
    NotificationsModule,
    forwardRef(() => VotesModule),
  ],
  controllers: [ContestantsController, MyContestantController],
  providers: [
    ListContestantsUseCase,
    GetContestantUseCase,
    GetContestantCredentialsUseCase,
    RegenerateMagicLinkUseCase,
    UpdateContestantUseCase,
    ProvisionContestantAccountUseCase,
    GetMyContestantProfilesUseCase,
    GetMyContestantProfileUseCase,
    {
      provide: CONTESTANTS_REPOSITORY,
      useClass: PrismaContestantsRepository,
    },
  ],
  exports: [CONTESTANTS_REPOSITORY, ProvisionContestantAccountUseCase],
})
export class ContestantsModule {}
