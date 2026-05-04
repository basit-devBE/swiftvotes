import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";

export class SubmitNominationDto {
  @IsString()
  categoryId!: string;

  @IsString()
  @MaxLength(160)
  submitterName!: string;

  @IsOptional()
  @IsEmail()
  submitterEmail?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  submitterPhone!: string;

  @IsString()
  @MaxLength(160)
  nomineeName!: string;

  @IsOptional()
  @IsEmail()
  nomineeEmail?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  nomineePhone!: string;

  @IsOptional()
  @IsUrl()
  nomineeImageUrl?: string;

  @IsOptional()
  @IsString()
  nomineeImageKey?: string;
}
