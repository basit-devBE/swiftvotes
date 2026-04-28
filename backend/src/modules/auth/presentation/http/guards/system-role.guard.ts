import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AuthenticatedRequestUser } from "../../../domain/authenticated-request-user";
import { SYSTEM_ROLES_KEY } from "../decorators/system-roles.decorator";
import { SystemRole } from "../../../../users/domain/system-role";

@Injectable()
export class SystemRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      SYSTEM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedRequestUser;
    }>();

    if (!request.user) {
      return false;
    }

    const isAllowed = requiredRoles.includes(request.user.systemRole);

    if (!isAllowed) {
      throw new ForbiddenException("You do not have enough privileges.");
    }

    return true;
  }
}
