import { IsEmail, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class SubmitNominationDto {
  @IsString()
  categoryId!: string;

  @IsString()
  @MaxLength(160)
  submitterName!: string;

  @IsEmail()
  submitterEmail!: string;

  @IsString()
  @MaxLength(160)
  nomineeName!: string;

  @IsOptional()
  @IsEmail()
  nomineeEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  nomineePhone?: string;

  @IsOptional()
  @IsUrl()
  nomineeImageUrl?: string;

  @IsOptional()
  @IsString()
  nomineeImageKey?: string;
}
