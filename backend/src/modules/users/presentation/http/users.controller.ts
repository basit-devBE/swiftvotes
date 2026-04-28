import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";

import { CurrentUser } from "../../../auth/presentation/http/decorators/current-user.decorator";
import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { SystemRoles } from "../../../auth/presentation/http/decorators/system-roles.decorator";
import { AuthenticatedRequestUser } from "../../../auth/domain/authenticated-request-user";
import { RegisterUserUseCase } from "../../application/use-cases/register-user.use-case";
import { ListUsersUseCase } from "../../application/use-cases/list-users.use-case";
import { GetCurrentUserUseCase } from "../../application/use-cases/get-current-user.use-case";
import { UpdateCurrentUserUseCase } from "../../application/use-cases/update-current-user.use-case";
import { ChangeUserStatusUseCase } from "../../application/use-cases/change-user-status.use-case";
import { SystemRole } from "../../domain/system-role";
import { ChangeUserStatusDto } from "./dto/change-user-status.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateCurrentUserDto } from "./dto/update-current-user.dto";
import { UserResponseDto } from "./responses/user-response.dto";

@Controller({
  path: "users",
  version: "1",
})
export class UsersController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly updateCurrentUserUseCase: UpdateCurrentUserUseCase,
    private readonly changeUserStatusUseCase: ChangeUserStatusUseCase,
  ) {}

  @Public()
  @Post()
  async register(@Body() body: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.registerUserUseCase.execute(body);
    return UserResponseDto.fromDomain(user);
  }

  @Get()
  @SystemRoles(SystemRole.SUPER_ADMIN)
  async listUsers(): Promise<UserResponseDto[]> {
    const users = await this.listUsersUseCase.execute();
    return users.map((user) => UserResponseDto.fromDomain(user));
  }

  @Get("me")
  async getCurrentUser(
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ): Promise<UserResponseDto> {
    const user = await this.getCurrentUserUseCase.execute(currentUser.id);
    return UserResponseDto.fromDomain(user);
  }

  @Patch("me")
  async updateCurrentUser(
    @CurrentUser() currentUser: AuthenticatedRequestUser,
    @Body() body: UpdateCurrentUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.updateCurrentUserUseCase.execute({
      userId: currentUser.id,
      fullName: body.fullName,
    });

    return UserResponseDto.fromDomain(user);
  }

  @Patch(":id/status")
  @SystemRoles(SystemRole.SUPER_ADMIN)
  async changeUserStatus(
    @Param("id") userId: string,
    @Body() body: ChangeUserStatusDto,
  ): Promise<UserResponseDto> {
    const user = await this.changeUserStatusUseCase.execute({
      userId,
      status: body.status,
    });

    return UserResponseDto.fromDomain(user);
  }
}
