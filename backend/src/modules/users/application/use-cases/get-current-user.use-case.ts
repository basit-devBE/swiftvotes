import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { User } from "../../domain/user";
import { USERS_REPOSITORY } from "../users.tokens";
import { UsersRepository } from "../ports/users.repository";

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException("User was not found.");
    }

    return user;
  }
}
