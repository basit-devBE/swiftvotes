import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { appConfig } from "../../core/config/app.config";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";
import { CONTESTANTS_REPOSITORY } from "./application/contestants.tokens";
import { GetContestantCredentialsUseCase } from "./application/use-cases/get-contestant-credentials.use-case";
import { GetContestantUseCase } from "./application/use-cases/get-contestant.use-case";
import { ListContestantsUseCase } from "./application/use-cases/list-contestants.use-case";
import { ProvisionContestantAccountUseCase } from "./application/use-cases/provision-contestant-account.use-case";
import { RegenerateMagicLinkUseCase } from "./application/use-cases/regenerate-magic-link.use-case";
import { PrismaContestantsRepository } from "./infrastructure/persistence/prisma-contestants.repository";
import { ContestantsController } from "./presentation/http/contestants.controller";

@Module({
  imports: [ConfigModule.forFeature(appConfig), AuthModule, UsersModule, NotificationsModule],
  controllers: [ContestantsController],
  providers: [
    ListContestantsUseCase,
    GetContestantUseCase,
    GetContestantCredentialsUseCase,
    RegenerateMagicLinkUseCase,
    ProvisionContestantAccountUseCase,
    {
      provide: CONTESTANTS_REPOSITORY,
      useClass: PrismaContestantsRepository,
    },
  ],
  exports: [CONTESTANTS_REPOSITORY, ProvisionContestantAccountUseCase],
})
export class ContestantsModule {}
