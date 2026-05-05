import { IsBoolean, IsDateString, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

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
  @IsBoolean()
  contestantsCanViewOwnVotes?: boolean;

  @IsOptional()
  @IsBoolean()
  contestantsCanViewLeaderboard?: boolean;

  @IsOptional()
  @IsBoolean()
  publicCanViewLeaderboard?: boolean;
}
