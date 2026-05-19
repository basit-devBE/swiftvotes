import {
  ConfirmPhoneVerificationResult,
} from "../../../application/use-cases/confirm-phone-verification.use-case";
import {
  StartPhoneVerificationResult,
} from "../../../application/use-cases/start-phone-verification.use-case";

export class StartPhoneVerificationResponseDto {
  challengeId!: string;
  maskedPhone!: string;
  expiresAt!: Date;
  resendAvailableAt!: Date;

  static fromResult(
    result: StartPhoneVerificationResult,
  ): StartPhoneVerificationResponseDto {
    return result;
  }
}

export class ConfirmPhoneVerificationResponseDto {
  challengeId!: string;
  verified!: true;
  phone!: string;
  normalizedPhone!: string;
  verifiedAt!: Date;

  static fromResult(
    result: ConfirmPhoneVerificationResult,
  ): ConfirmPhoneVerificationResponseDto {
    return result;
  }
}
