import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import { PhoneVerificationPurpose } from "../../domain/phone-verification-purpose";

export type AssertPhoneVerificationInput = {
  challengeId: string;
  phone: string;
  purpose: PhoneVerificationPurpose;
};

export type AssertPhoneVerificationResult = {
  challengeId: string;
  phone: string;
  normalizedPhone: string;
  verifiedAt: Date;
};

@Injectable()
export class AssertPhoneVerificationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: AssertPhoneVerificationInput,
  ): Promise<AssertPhoneVerificationResult> {
    const normalizedPhone = this.normalizeGhanaPhone(input.phone);
    const challenge = await this.prisma.phoneVerificationChallenge.findUnique({
      where: { id: input.challengeId },
    });

    if (!challenge || challenge.purpose !== input.purpose) {
      throw new NotFoundException("Verification challenge was not found.");
    }
    if (!challenge.verifiedAt) {
      throw new BadRequestException("Phone number has not been verified.");
    }
    if (challenge.expiresAt < new Date()) {
      throw new BadRequestException("Phone verification has expired.");
    }
    if (challenge.normalizedPhone !== normalizedPhone) {
      throw new BadRequestException("Verified phone number does not match.");
    }

    return {
      challengeId: challenge.id,
      phone: challenge.phone,
      normalizedPhone: challenge.normalizedPhone,
      verifiedAt: challenge.verifiedAt,
    };
  }

  private normalizeGhanaPhone(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (/^0\d{9}$/.test(digits)) return `233${digits.slice(1)}`;
    if (/^233\d{9}$/.test(digits)) return digits;
    throw new BadRequestException(
      "Enter a valid Ghana phone number, e.g. 0241234567.",
    );
  }
}
