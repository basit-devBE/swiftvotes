import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { AuthenticatedRequestUser } from "../../../domain/authenticated-request-user";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedRequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedRequestUser }>();
    return request.user;
  },
);
