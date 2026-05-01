import { IsBoolean, IsOptional } from "class-validator";

export class UpdateEventVisibilityDto {
  @IsOptional()
  @IsBoolean()
  contestantsCanViewOwnVotes?: boolean;

  @IsOptional()
  @IsBoolean()
  contestantsCanViewLeaderboard?: boolean;
}
