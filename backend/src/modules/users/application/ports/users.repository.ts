import { SystemRole } from "../../domain/system-role";
import { User } from "../../domain/user";
import { UserStatus } from "../../domain/user-status";

export type CreateUserRecord = {
  email: string;
  passwordHash: string;
  fullName: string;
  systemRole?: SystemRole;
  status?: UserStatus;
};

export type UpdateUserRecord = {
  fullName?: string;
};

export interface UsersRepository {
  create(input: CreateUserRecord): Promise<User>;
  findAll(): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  update(id: string, input: UpdateUserRecord): Promise<User>;
  updateStatus(id: string, status: UserStatus): Promise<User>;
  upsertByEmail(email: string, onCreate: CreateUserRecord): Promise<{ user: User; created: boolean }>;
}
