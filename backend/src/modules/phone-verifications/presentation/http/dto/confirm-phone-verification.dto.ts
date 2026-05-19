import { IsIn, IsString, MaxLength } from "class-validator";

import { PhoneVerificationPurpose } from "../../../domain/phone-verification-purpose";

export class ConfirmPhoneVerificationDto {
  @IsString()
  challengeId!: string;

  @IsString()
  @MaxLength(12)
  code!: string;

  @IsIn([PhoneVerificationPurpose.JUNIPAY_COLLECTION])
  purpose!: PhoneVerificationPurpose;
}
