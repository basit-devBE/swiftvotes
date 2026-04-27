import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";
import { ApproveEventUseCase } from "./application/use-cases/approve-event.use-case";
import { CreateCategoryUseCase } from "./application/use-cases/create-category.use-case";
import { CreateEventUseCase } from "./application/use-cases/create-event.use-case";
import { DeleteCategoryUseCase } from "./application/use-cases/delete-category.use-case";
import { GetEventDetailsUseCase } from "./application/use-cases/get-event-details.use-case";
import { ListMyEventsUseCase } from "./application/use-cases/list-my-events.use-case";
import { ListPendingEventsUseCase } from "./application/use-cases/list-pending-events.use-case";
import { RejectEventUseCase } from "./application/use-cases/reject-event.use-case";
import { ResubmitEventUseCase } from "./application/use-cases/resubmit-event.use-case";
import { SubmitEventUseCase } from "./application/use-cases/submit-event.use-case";
import { SynchronizeEventLifecycleUseCase } from "./application/use-cases/synchronize-event-lifecycle.use-case";
import { UpdateCategoryUseCase } from "./application/use-cases/update-category.use-case";
import { UpdateEventUseCase } from "./application/use-cases/update-event.use-case";
import { EVENTS_REPOSITORY } from "./application/events.tokens";
import { PrismaEventsRepository } from "./infrastructure/persistence/prisma-events.repository";
import { EventsController } from "./presentation/http/events.controller";

@Module({
  imports: [UsersModule, NotificationsModule],
  controllers: [EventsController],
  providers: [
    CreateEventUseCase,
    ListMyEventsUseCase,
    GetEventDetailsUseCase,
    UpdateEventUseCase,
    SubmitEventUseCase,
    ResubmitEventUseCase,
    ListPendingEventsUseCase,
    ApproveEventUseCase,
    RejectEventUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    SynchronizeEventLifecycleUseCase,
    {
      provide: EVENTS_REPOSITORY,
      useClass: PrismaEventsRepository,
    },
  ],
  exports: [EVENTS_REPOSITORY, SynchronizeEventLifecycleUseCase],
})
export class EventsModule {}
