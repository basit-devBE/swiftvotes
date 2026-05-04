import { IsEmail, IsOptional } from "class-validator";

export class ConfirmNominationDto {
  @IsOptional()
  @IsEmail()
  nomineeEmail?: string;
}
