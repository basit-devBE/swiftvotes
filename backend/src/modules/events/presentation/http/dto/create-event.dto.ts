import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from "class-validator";

import { CreateEventCategoryDto } from "./create-event-category.dto";
import { EventType } from "../../../domain/event-type";

export class CreateEventDto {
  @IsString()
  @MaxLength(180)
  name!: string;

  @IsString()
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsBoolean()
  hasVoting?: boolean;

  @IsOptional()
  @IsBoolean()
  hasTicketing?: boolean;

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

  @IsOptional()
  @IsDateString()
  eventStartAt?: string;

  @IsOptional()
  @IsDateString()
  eventEndAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  venueName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  venueAddress?: string;

  @IsOptional()
  @IsDateString()
  ticketSalesStartAt?: string;

  @IsOptional()
  @IsDateString()
  ticketSalesEndAt?: string;

  @IsOptional()
  @IsBoolean()
  contestantsCanViewOwnVotes?: boolean;

  @IsOptional()
  @IsBoolean()
  contestantsCanViewLeaderboard?: boolean;

  @IsOptional()
  @IsBoolean()
  publicCanViewLeaderboard?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateEventCategoryDto)
  categories?: CreateEventCategoryDto[];
}
