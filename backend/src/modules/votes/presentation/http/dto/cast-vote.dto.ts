import { IsEmail, IsInt, IsString, MaxLength, Min } from "class-validator";

export class CastVoteDto {
  @IsString()
  contestantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @MaxLength(160)
  voterName!: string;

  @IsEmail()
  voterEmail!: string;
}
