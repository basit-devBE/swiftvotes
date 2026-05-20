import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";

import { EventType } from "../../../domain/event-type";

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsBoolean()
  hasVoting?: boolean;

  @IsOptional()
  @IsBoolean()
  hasTicketing?: boolean;

  @IsOptional()
  @IsUrl()
  primaryFlyerUrl?: string;

  @IsOptional()
  @IsString()
  primaryFlyerKey?: string;

  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  bannerKey?: string;

  @IsOptional()
  @IsDateString()
  nominationStartAt?: string | null;

  @IsOptional()
  @IsDateString()
  nominationEndAt?: string | null;

  @IsOptional()
  @IsDateString()
  votingStartAt?: string;

  @IsOptional()
  @IsDateString()
  votingEndAt?: string;

  @IsOptional()
  @IsDateString()
  eventStartAt?: string | null;

  @IsOptional()
  @IsDateString()
  eventEndAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  venueName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  venueAddress?: string | null;

  @IsOptional()
  @IsDateString()
  ticketSalesStartAt?: string | null;

  @IsOptional()
  @IsDateString()
  ticketSalesEndAt?: string | null;

  @IsOptional()
  @IsBoolean()
  contestantsCanViewOwnVotes?: boolean;

  @IsOptional()
  @IsBoolean()
  contestantsCanViewLeaderboard?: boolean;

  @IsOptional()
  @IsBoolean()
  publicCanViewLeaderboard?: boolean;

  // Older event-editor payloads included categories on update. Keep accepting
  // the key so strict validation does not block event media/details updates.
  @IsOptional()
  categories?: unknown;
}
