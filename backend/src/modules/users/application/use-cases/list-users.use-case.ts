import { Inject, Injectable } from "@nestjs/common";

import { User } from "../../domain/user";
import { USERS_REPOSITORY } from "../users.tokens";
import { UsersRepository } from "../ports/users.repository";

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  execute(): Promise<User[]> {
    return this.usersRepository.findAll();
  }
}
