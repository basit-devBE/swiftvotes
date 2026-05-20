import {
  IsEmail,
  IsInt,
  IsOptional,
  IsIn,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from "class-validator";

import { IsMatchingMomoProviderPhone } from "../../../../../shared/validation/momo-provider-phone.validator";

export class CastVoteDto {
  @IsString()
  contestantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @MaxLength(160)
  voterName!: string;

  @IsEmail()
  voterEmail!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  callbackOrigin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @IsMatchingMomoProviderPhone("momoProvider")
  voterPhone?: string;

  @IsOptional()
  @IsIn(["mtn", "vodafone", "airteltigo"])
  momoProvider?: "mtn" | "vodafone" | "airteltigo";

  @IsOptional()
  @IsString()
  phoneVerificationChallengeId?: string;
}
