-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'ABANDONED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "providerRef" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "amountMinor" INTEGER NOT NULL,
    "amountPaidMinor" INTEGER,
    "feeMinor" INTEGER,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "initializedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "voterEmail" TEXT NOT NULL,
    "voterName" TEXT,
    "channel" TEXT,
    "cardLast4" TEXT,
    "mobileNumber" TEXT,
    "customerIp" TEXT,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "voteId" TEXT,
    "rawInitResponse" JSONB,
    "rawVerifyResponse" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "eventType" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_voteId_key" ON "Payment"("voteId");

-- CreateIndex
CREATE INDEX "Payment_eventId_status_createdAt_idx" ON "Payment"("eventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_voterEmail_createdAt_idx" ON "Payment"("voterEmail", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_providerRef_idx" ON "Payment"("providerRef");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_reference_idx" ON "PaymentWebhookEvent"("reference");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_receivedAt_idx" ON "PaymentWebhookEvent"("receivedAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "Vote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
