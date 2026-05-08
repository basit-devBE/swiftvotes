import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from "class-validator";

export class UpdateContestantDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^(?!([0-9])\1{9}$)\d{10}$/, {
    message: "phone must be a valid 10-digit phone number.",
  })
  phone?: string | null;

  @IsOptional()
  @IsUrl()
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  imageKey?: string | null;
}
