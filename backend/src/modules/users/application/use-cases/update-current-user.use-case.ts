import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { User } from "../../domain/user";
import { USERS_REPOSITORY } from "../users.tokens";
import { UsersRepository } from "../ports/users.repository";

export type UpdateCurrentUserInput = {
  userId: string;
  fullName: string;
};

@Injectable()
export class UpdateCurrentUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(input: UpdateCurrentUserInput): Promise<User> {
    const existing = await this.usersRepository.findById(input.userId);

    if (!existing) {
      throw new NotFoundException("User was not found.");
    }

    return this.usersRepository.update(input.userId, {
      fullName: input.fullName.trim(),
    });
  }
}
