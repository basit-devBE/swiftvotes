import { SystemRole } from "../../users/domain/system-role";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  systemRole: SystemRole;
  type: "access";
};
