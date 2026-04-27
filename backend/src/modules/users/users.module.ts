import { Module } from "@nestjs/common";

import { USERS_REPOSITORY } from "./application/users.tokens";
import { ChangeUserStatusUseCase } from "./application/use-cases/change-user-status.use-case";
import { GetCurrentUserUseCase } from "./application/use-cases/get-current-user.use-case";
import { ListUsersUseCase } from "./application/use-cases/list-users.use-case";
import { RegisterUserUseCase } from "./application/use-cases/register-user.use-case";
import { UpdateCurrentUserUseCase } from "./application/use-cases/update-current-user.use-case";
import { PrismaUsersRepository } from "./infrastructure/persistence/prisma-users.repository";
import { UsersController } from "./presentation/http/users.controller";

@Module({
  controllers: [UsersController],
  providers: [
    RegisterUserUseCase,
    ListUsersUseCase,
    GetCurrentUserUseCase,
    UpdateCurrentUserUseCase,
    ChangeUserStatusUseCase,
    {
      provide: USERS_REPOSITORY,
      useClass: PrismaUsersRepository,
    },
  ],
  exports: [USERS_REPOSITORY],
})
export class UsersModule {}
