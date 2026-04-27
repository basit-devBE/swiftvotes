import {
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";

import { SystemRole } from "../../../users/domain/system-role";
import { EVENT_MEMBERSHIPS_REPOSITORY } from "../access-control.tokens";
import { EventMembershipsRepository } from "../ports/event-memberships.repository";
import { EventMembership } from "../../domain/event-membership";
import { EventRole } from "../../domain/event-role";

@Injectable()
export class EventAccessService {
  constructor(
    @Inject(EVENT_MEMBERSHIPS_REPOSITORY)
    private readonly membershipsRepository: EventMembershipsRepository,
  ) {}

  async getActiveMembership(
    userId: string,
    eventId: string,
  ): Promise<EventMembership | null> {
    return this.membershipsRepository.findActiveMembership(userId, eventId);
  }

  async assertHasAnyRole(input: {
    userId: string;
    systemRole: SystemRole;
    eventId: string;
    allowedRoles: EventRole[];
  }): Promise<void> {
    if (input.systemRole === SystemRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.membershipsRepository.findActiveMembership(
      input.userId,
      input.eventId,
    );

    if (!membership || !input.allowedRoles.includes(membership.role)) {
      throw new ForbiddenException(
        "You do not have access to operate on this event.",
      );
    }
  }
}
