import { IsEnum } from "class-validator";

import { UserStatus } from "../../../domain/user-status";

export class ChangeUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}
