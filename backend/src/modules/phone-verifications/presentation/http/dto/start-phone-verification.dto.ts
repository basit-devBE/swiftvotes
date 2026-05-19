import { IsIn, IsString, MaxLength } from "class-validator";

import { PhoneVerificationPurpose } from "../../../domain/phone-verification-purpose";

export class StartPhoneVerificationDto {
  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsIn([PhoneVerificationPurpose.JUNIPAY_COLLECTION])
  purpose!: PhoneVerificationPurpose;
}
