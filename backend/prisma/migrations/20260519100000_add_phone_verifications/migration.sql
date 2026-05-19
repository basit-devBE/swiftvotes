-- CreateEnum
CREATE TYPE "PhoneVerificationPurpose" AS ENUM ('JUNIPAY_COLLECTION');

-- CreateTable
CREATE TABLE "PhoneVerificationChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "purpose" "PhoneVerificationPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneVerificationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhoneVerificationChallenge_normalizedPhone_purpose_createdAt_idx" ON "PhoneVerificationChallenge"("normalizedPhone", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "PhoneVerificationChallenge_expiresAt_idx" ON "PhoneVerificationChallenge"("expiresAt");
