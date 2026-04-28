import { IsString, MinLength } from "class-validator";

export class RejectEventDto {
  @IsString()
  @MinLength(10)
  reason!: string;
}
