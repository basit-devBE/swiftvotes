import { IsString, MinLength } from "class-validator";

export class RejectNominationDto {
  @IsString()
  @MinLength(5)
  reason!: string;
}
