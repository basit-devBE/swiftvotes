import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
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
  @Matches(/^\d{10}$/, {
    message: "submitterPhone must be a 10-digit phone number.",
  })
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
  @Matches(/^\d{10}$/, {
    message: "nomineePhone must be a 10-digit phone number.",
  })
  nomineePhone!: string;

  @IsOptional()
  @IsUrl()
  nomineeImageUrl?: string;

  @IsOptional()
  @IsString()
  nomineeImageKey?: string;
}
