-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('VOTING', 'TICKETING');

-- CreateEnum
CREATE TYPE "TicketOrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'ABANDONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IssuedTicketStatus" AS ENUM ('VALID', 'CHECKED_IN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'ABANDONED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Event"
ADD COLUMN "eventType" "EventType" NOT NULL DEFAULT 'VOTING',
ADD COLUMN "eventStartAt" TIMESTAMP(3),
ADD COLUMN "eventEndAt" TIMESTAMP(3),
ADD COLUMN "venueName" TEXT,
ADD COLUMN "venueAddress" TEXT,
ADD COLUMN "ticketSalesStartAt" TIMESTAMP(3),
ADD COLUMN "ticketSalesEndAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TicketType" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "quantityAvailable" INTEGER,
    "quantitySold" INTEGER NOT NULL DEFAULT 0,
    "salesStartAt" TIMESTAMP(3),
    "salesEndAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketOrder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "status" "TicketOrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "totalAmountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuedTicket" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "IssuedTicketStatus" NOT NULL DEFAULT 'VALID',
    "checkedInAt" TIMESTAMP(3),
    "checkedInById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssuedTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "providerRef" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "amountMinor" INTEGER NOT NULL,
    "amountPaidMinor" INTEGER,
    "feeMinor" INTEGER,
    "currency" TEXT NOT NULL,
    "status" "TicketPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "initializedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "buyerEmail" TEXT NOT NULL,
    "buyerName" TEXT,
    "buyerPhone" TEXT,
    "channel" TEXT,
    "cardLast4" TEXT,
    "mobileNumber" TEXT,
    "customerIp" TEXT,
    "rawInitResponse" JSONB,
    "rawVerifyResponse" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "ticketPaymentId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "eventType" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "TicketPaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_eventType_status_idx" ON "Event"("eventType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TicketType_eventId_name_key" ON "TicketType"("eventId", "name");

-- CreateIndex
CREATE INDEX "TicketType_eventId_sortOrder_idx" ON "TicketType"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "TicketType_eventId_isActive_idx" ON "TicketType"("eventId", "isActive");

-- CreateIndex
CREATE INDEX "TicketOrder_eventId_status_createdAt_idx" ON "TicketOrder"("eventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TicketOrder_buyerEmail_createdAt_idx" ON "TicketOrder"("buyerEmail", "createdAt");

-- CreateIndex
CREATE INDEX "TicketOrderItem_orderId_idx" ON "TicketOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "TicketOrderItem_ticketTypeId_idx" ON "TicketOrderItem"("ticketTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedTicket_code_key" ON "IssuedTicket"("code");

-- CreateIndex
CREATE INDEX "IssuedTicket_eventId_status_idx" ON "IssuedTicket"("eventId", "status");

-- CreateIndex
CREATE INDEX "IssuedTicket_orderId_idx" ON "IssuedTicket"("orderId");

-- CreateIndex
CREATE INDEX "IssuedTicket_ticketTypeId_idx" ON "IssuedTicket"("ticketTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPayment_orderId_key" ON "TicketPayment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPayment_reference_key" ON "TicketPayment"("reference");

-- CreateIndex
CREATE INDEX "TicketPayment_status_createdAt_idx" ON "TicketPayment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TicketPayment_buyerEmail_createdAt_idx" ON "TicketPayment"("buyerEmail", "createdAt");

-- CreateIndex
CREATE INDEX "TicketPayment_providerRef_idx" ON "TicketPayment"("providerRef");

-- CreateIndex
CREATE INDEX "TicketPaymentWebhookEvent_reference_idx" ON "TicketPaymentWebhookEvent"("reference");

-- CreateIndex
CREATE INDEX "TicketPaymentWebhookEvent_receivedAt_idx" ON "TicketPaymentWebhookEvent"("receivedAt");

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketOrder" ADD CONSTRAINT "TicketOrder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketOrderItem" ADD CONSTRAINT "TicketOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TicketOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketOrderItem" ADD CONSTRAINT "TicketOrderItem_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedTicket" ADD CONSTRAINT "IssuedTicket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedTicket" ADD CONSTRAINT "IssuedTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TicketOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedTicket" ADD CONSTRAINT "IssuedTicket_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "TicketOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedTicket" ADD CONSTRAINT "IssuedTicket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedTicket" ADD CONSTRAINT "IssuedTicket_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPayment" ADD CONSTRAINT "TicketPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TicketOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPaymentWebhookEvent" ADD CONSTRAINT "TicketPaymentWebhookEvent_ticketPaymentId_fkey" FOREIGN KEY ("ticketPaymentId") REFERENCES "TicketPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
