import {
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

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
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("EventAccessService");
  }

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
    const base = {
      scope: "event-access",
      userId: input.userId,
      systemRole: input.systemRole,
      eventId: input.eventId,
      allowedRoles: input.allowedRoles,
    };

    if (input.systemRole === SystemRole.SUPER_ADMIN) {
      this.logger.info(
        { ...base, decision: "allow", reason: "super_admin" },
        "event-access decision",
      );
      return;
    }

    const membership = await this.membershipsRepository.findActiveMembership(
      input.userId,
      input.eventId,
    );

    if (!membership) {
      this.logger.warn(
        { ...base, decision: "deny", reason: "no_membership" },
        "event-access decision",
      );
      throw new ForbiddenException(
        "You do not have access to operate on this event.",
      );
    }

    if (!input.allowedRoles.includes(membership.role)) {
      this.logger.warn(
        {
          ...base,
          decision: "deny",
          reason: "role_not_allowed",
          foundRole: membership.role,
          membershipStatus: membership.status,
          membershipId: membership.id,
        },
        "event-access decision",
      );
      throw new ForbiddenException(
        "You do not have access to operate on this event.",
      );
    }

    this.logger.info(
      {
        ...base,
        decision: "allow",
        reason: "role_match",
        foundRole: membership.role,
        membershipId: membership.id,
      },
      "event-access decision",
    );
  }
}
