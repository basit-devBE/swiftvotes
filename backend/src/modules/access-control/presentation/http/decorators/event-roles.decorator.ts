import { SetMetadata } from "@nestjs/common";

import { EventRole } from "../../../domain/event-role";

export const EVENT_ROLES_KEY = "eventRoles";
export const EventRoles = (...roles: EventRole[]) =>
  SetMetadata(EVENT_ROLES_KEY, roles);
