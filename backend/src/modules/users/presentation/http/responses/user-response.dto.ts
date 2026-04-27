import { User } from "../../../domain/user";

export class UserResponseDto {
  id!: string;
  email!: string;
  fullName!: string;
  systemRole!: string;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;

  static fromDomain(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      systemRole: user.systemRole,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
