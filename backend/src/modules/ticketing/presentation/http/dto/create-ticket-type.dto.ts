import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateTicketTypeDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsInt()
  @Min(50)
  priceMinor!: number;

  @IsString()
  @MaxLength(10)
  currency!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantityAvailable?: number | null;

  @IsOptional()
  @IsDateString()
  salesStartAt?: string | null;

  @IsOptional()
  @IsDateString()
  salesEndAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
