import { IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from "class-validator";

export class CreateEventCategoryDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsInt()
  @Min(0, {
    message:
      "votePriceMinor must be 0 for free voting or at least 50 for paid voting.",
  })
  votePriceMinor!: number;

  @IsString()
  @MaxLength(8)
  currency!: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  imageKey?: string;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}
