import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import { PhoneVerificationPurpose } from "../../domain/phone-verification-purpose";
import { StartPhoneVerificationUseCase } from "./start-phone-verification.use-case";

export type ConfirmPhoneVerificationInput = {
  challengeId: string;
  code: string;
  purpose: PhoneVerificationPurpose;
};

export type ConfirmPhoneVerificationResult = {
  challengeId: string;
  verified: true;
  phone: string;
  normalizedPhone: string;
  verifiedAt: Date;
};

@Injectable()
export class ConfirmPhoneVerificationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: ConfirmPhoneVerificationInput,
  ): Promise<ConfirmPhoneVerificationResult> {
    const challenge = await this.prisma.phoneVerificationChallenge.findUnique({
      where: { id: input.challengeId },
    });

    if (!challenge || challenge.purpose !== input.purpose) {
      throw new NotFoundException("Verification challenge was not found.");
    }

    if (challenge.verifiedAt) {
      return {
        challengeId: challenge.id,
        verified: true,
        phone: challenge.phone,
        normalizedPhone: challenge.normalizedPhone,
        verifiedAt: challenge.verifiedAt,
      };
    }

    if (challenge.expiresAt < new Date()) {
      throw new BadRequestException("Verification code has expired.");
    }

    if (challenge.attemptCount >= challenge.maxAttempts) {
      throw new BadRequestException("Too many verification attempts. Request a new code.");
    }

    const code = input.code.replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException("Verification code must be 6 digits.");
    }

    const valid = StartPhoneVerificationUseCase.verifyCode(
      code,
      challenge.codeHash,
    );

    if (!valid) {
      await this.prisma.phoneVerificationChallenge.update({
        where: { id: challenge.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new BadRequestException("Verification code is incorrect.");
    }

    const verifiedAt = new Date();
    const updated = await this.prisma.phoneVerificationChallenge.update({
      where: { id: challenge.id },
      data: { verifiedAt },
    });

    return {
      challengeId: updated.id,
      verified: true,
      phone: updated.phone,
      normalizedPhone: updated.normalizedPhone,
      verifiedAt: updated.verifiedAt!,
    };
  }
}
