import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from "class-validator";

import { CreateEventCategoryDto } from "./create-event-category.dto";

export class CreateEventDto {
  @IsString()
  @MaxLength(180)
  name!: string;

  @IsString()
  @MaxLength(4000)
  description!: string;

  @IsUrl()
  primaryFlyerUrl!: string;

  @IsString()
  primaryFlyerKey!: string;

  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  bannerKey?: string;

  @IsOptional()
  @IsDateString()
  nominationStartAt?: string;

  @IsOptional()
  @IsDateString()
  nominationEndAt?: string;

  @IsDateString()
  votingStartAt!: string;

  @IsDateString()
  votingEndAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateEventCategoryDto)
  categories!: CreateEventCategoryDto[];
}
