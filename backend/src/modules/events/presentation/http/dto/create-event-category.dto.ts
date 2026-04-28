import { IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from "class-validator";

export class CreateEventCategoryDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsInt()
  @Min(0)
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
