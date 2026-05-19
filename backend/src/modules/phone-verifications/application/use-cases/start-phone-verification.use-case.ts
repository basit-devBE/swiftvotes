import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { randomInt, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import { ArkeselSmsService } from "../../../notifications/infrastructure/sms/arkesel-sms.service";
import { PhoneVerificationPurpose } from "../../domain/phone-verification-purpose";

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

export type StartPhoneVerificationInput = {
  phone: string;
  purpose: PhoneVerificationPurpose;
};

export type StartPhoneVerificationResult = {
  challengeId: string;
  maskedPhone: string;
  expiresAt: Date;
  resendAvailableAt: Date;
};

@Injectable()
export class StartPhoneVerificationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: ArkeselSmsService,
  ) {}

  async execute(
    input: StartPhoneVerificationInput,
  ): Promise<StartPhoneVerificationResult> {
    const phone = this.normalizeGhanaPhone(input.phone);
    const now = new Date();
    const resendWindow = new Date(now.getTime() - RESEND_COOLDOWN_SECONDS * 1000);

    const recent = await this.prisma.phoneVerificationChallenge.findFirst({
      where: {
        normalizedPhone: phone.international,
        purpose: input.purpose,
        createdAt: { gt: resendWindow },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recent) {
      throw new ConflictException(
        "A verification code was sent recently. Please wait before requesting another one.",
      );
    }

    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);
    const challenge = await this.prisma.phoneVerificationChallenge.create({
      data: {
        phone: phone.local,
        normalizedPhone: phone.international,
        purpose: input.purpose,
        codeHash: this.hashCode(code),
        expiresAt,
        maxAttempts: MAX_ATTEMPTS,
      },
    });

    await this.sms.send({
      recipient: phone.international,
      message: `Your SwiftVote verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Do not share this code.`,
    });

    return {
      challengeId: challenge.id,
      maskedPhone: this.maskPhone(phone.local),
      expiresAt,
      resendAvailableAt: new Date(now.getTime() + RESEND_COOLDOWN_SECONDS * 1000),
    };
  }

  private normalizeGhanaPhone(value: string): { local: string; international: string } {
    const digits = value.replace(/\D/g, "");
    if (/^0\d{9}$/.test(digits)) {
      return { local: digits, international: `233${digits.slice(1)}` };
    }
    if (/^233\d{9}$/.test(digits)) {
      return { local: `0${digits.slice(3)}`, international: digits };
    }
    throw new BadRequestException(
      "Enter a valid Ghana phone number, e.g. 0241234567.",
    );
  }

  private maskPhone(phone: string): string {
    return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
  }

  private hashCode(code: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(code, salt, 32).toString("hex");
    return `${salt}:${hash}`;
  }

  static verifyCode(code: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const candidate = scryptSync(code, salt, 32);
    const expected = Buffer.from(hash, "hex");
    return (
      candidate.length === expected.length &&
      timingSafeEqual(candidate, expected)
    );
  }
}
