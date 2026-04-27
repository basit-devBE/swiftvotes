import { SystemRole } from "../../users/domain/system-role";

export type AuthenticatedRequestUser = {
  id: string;
  email: string;
  fullName: string;
  systemRole: SystemRole;
};
