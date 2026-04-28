import { SetMetadata } from "@nestjs/common";

import { SystemRole } from "../../../../users/domain/system-role";

export const SYSTEM_ROLES_KEY = "systemRoles";
export const SystemRoles = (...roles: SystemRole[]) =>
  SetMetadata(SYSTEM_ROLES_KEY, roles);
