import { IsString, MinLength } from "class-validator";

export class UpdateCurrentUserDto {
  @IsString()
  @MinLength(2)
  fullName!: string;
}
