import { Module } from "@nestjs/common";

import { EventsModule } from "../events/events.module";
import { NOMINATIONS_REPOSITORY } from "./application/nominations.tokens";
import { ConfirmNominationUseCase } from "./application/use-cases/confirm-nomination.use-case";
import { ListNominationsUseCase } from "./application/use-cases/list-nominations.use-case";
import { RejectNominationUseCase } from "./application/use-cases/reject-nomination.use-case";
import { SubmitNominationUseCase } from "./application/use-cases/submit-nomination.use-case";
import { PrismaNominationsRepository } from "./infrastructure/persistence/prisma-nominations.repository";
import { NominationsController } from "./presentation/http/nominations.controller";

@Module({
  imports: [EventsModule],
  controllers: [NominationsController],
  providers: [
    SubmitNominationUseCase,
    ListNominationsUseCase,
    ConfirmNominationUseCase,
    RejectNominationUseCase,
    {
      provide: NOMINATIONS_REPOSITORY,
      useClass: PrismaNominationsRepository,
    },
  ],
})
export class NominationsModule {}
