import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { User } from "../../domain/user";
import { UserStatus } from "../../domain/user-status";
import { USERS_REPOSITORY } from "../users.tokens";
import { UsersRepository } from "../ports/users.repository";

export type ChangeUserStatusInput = {
  userId: string;
  status: UserStatus;
};

@Injectable()
export class ChangeUserStatusUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(input: ChangeUserStatusInput): Promise<User> {
    const existing = await this.usersRepository.findById(input.userId);

    if (!existing) {
      throw new NotFoundException("User was not found.");
    }

    return this.usersRepository.updateStatus(input.userId, input.status);
  }
}
