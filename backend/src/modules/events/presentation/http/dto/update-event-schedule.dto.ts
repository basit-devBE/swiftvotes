import { IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateEventScheduleDto {
  @IsOptional()
  @IsISO8601()
  nominationStartAt?: string | null;

  @IsOptional()
  @IsISO8601()
  nominationEndAt?: string | null;

  @IsOptional()
  @IsISO8601()
  votingStartAt?: string;

  @IsOptional()
  @IsISO8601()
  votingEndAt?: string;

  @IsOptional()
  @IsISO8601()
  ticketSalesStartAt?: string | null;

  @IsOptional()
  @IsISO8601()
  ticketSalesEndAt?: string | null;

  @IsOptional()
  @IsISO8601()
  eventStartAt?: string | null;

  @IsOptional()
  @IsISO8601()
  eventEndAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  venueName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  venueAddress?: string | null;
}
