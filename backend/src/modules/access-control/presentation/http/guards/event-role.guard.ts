import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AuthenticatedRequestUser } from "../../../../auth/domain/authenticated-request-user";
import { EventAccessService } from "../../../application/services/event-access.service";
import { EVENT_ROLES_KEY } from "../decorators/event-roles.decorator";
import { EventRole } from "../../../domain/event-role";

@Injectable()
export class EventRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly eventAccessService: EventAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<EventRole[]>(
      EVENT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedRequestUser;
      params: { eventId?: string };
    }>();

    if (!request.user) {
      return false;
    }

    const eventId = request.params?.eventId;

    if (!eventId) {
      throw new ForbiddenException(
        "Event-scoped access requires an event identifier.",
      );
    }

    await this.eventAccessService.assertHasAnyRole({
      userId: request.user.id,
      systemRole: request.user.systemRole,
      eventId,
      allowedRoles: requiredRoles,
    });

    return true;
  }
}
