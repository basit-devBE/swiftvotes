import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { EventAccessService } from "./application/services/event-access.service";
import { EVENT_MEMBERSHIPS_REPOSITORY } from "./application/access-control.tokens";
import { PrismaEventMembershipsRepository } from "./infrastructure/persistence/prisma-event-memberships.repository";
import { EventRoleGuard } from "./presentation/http/guards/event-role.guard";

@Module({
  providers: [
    EventAccessService,
    {
      provide: EVENT_MEMBERSHIPS_REPOSITORY,
      useClass: PrismaEventMembershipsRepository,
    },
    {
      provide: APP_GUARD,
      useClass: EventRoleGuard,
    },
  ],
  exports: [EventAccessService, EVENT_MEMBERSHIPS_REPOSITORY],
})
export class AccessControlModule {}
