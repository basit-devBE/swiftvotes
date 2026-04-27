import { SystemRole } from "./system-role";
import { UserStatus } from "./user-status";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  systemRole: SystemRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};
