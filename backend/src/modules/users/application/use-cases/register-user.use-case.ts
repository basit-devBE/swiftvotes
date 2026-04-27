import {
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  PASSWORD_HASHER,
  PasswordHasher,
} from "../../../../core/security/password-hasher";
import { SystemRole } from "../../domain/system-role";
import { User } from "../../domain/user";
import { UserStatus } from "../../domain/user-status";
import { USERS_REPOSITORY } from "../users.tokens";
import { UsersRepository } from "../ports/users.repository";

export type RegisterUserInput = {
  email: string;
  password: string;
  fullName: string;
};

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await this.usersRepository.findByEmail(normalizedEmail);

    if (existing) {
      throw new ConflictException("Email is already registered.");
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.usersRepository.create({
      email: normalizedEmail,
      fullName: input.fullName.trim(),
      passwordHash,
      systemRole: SystemRole.NONE,
      status: UserStatus.ACTIVE,
    });
  }
}
