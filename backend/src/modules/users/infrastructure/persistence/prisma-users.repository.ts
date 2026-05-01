import { Injectable } from "@nestjs/common";
import {
  SystemRole as PrismaSystemRole,
  User as PrismaUser,
  UserStatus as PrismaUserStatus,
} from "@prisma/client";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import { SystemRole } from "../../domain/system-role";
import { User } from "../../domain/user";
import { UserStatus } from "../../domain/user-status";
import {
  CreateUserRecord,
  UpdateUserRecord,
  UsersRepository,
} from "../../application/ports/users.repository";

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserRecord): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash: input.passwordHash,
        status: (input.status ?? UserStatus.ACTIVE) as PrismaUserStatus,
        systemRole: (input.systemRole ?? SystemRole.NONE) as PrismaSystemRole,
      },
    });

    return this.toDomain(user);
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    return users.map((user) => this.toDomain(user));
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.toDomain(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.toDomain(user) : null;
  }

  async update(id: string, input: UpdateUserRecord): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: input.fullName,
      },
    });

    return this.toDomain(user);
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        status: status as PrismaUserStatus,
      },
    });

    return this.toDomain(user);
  }

  async upsertByEmail(email: string, onCreate: CreateUserRecord): Promise<{ user: User; created: boolean }> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { user: this.toDomain(existing), created: false };
    }
    const created = await this.prisma.user.create({
      data: {
        email: onCreate.email,
        fullName: onCreate.fullName,
        passwordHash: onCreate.passwordHash,
        status: (onCreate.status ?? UserStatus.ACTIVE) as PrismaUserStatus,
        systemRole: (onCreate.systemRole ?? SystemRole.NONE) as PrismaSystemRole,
      },
    });
    return { user: this.toDomain(created), created: true };
  }

  private toDomain(user: PrismaUser): User {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      passwordHash: user.passwordHash,
      status: user.status as UserStatus,
      systemRole: user.systemRole as SystemRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
