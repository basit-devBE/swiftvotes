-- CreateEnum
CREATE TYPE "VoteStatus" AS ENUM ('FREE', 'PENDING_PAYMENT', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "voterName" TEXT NOT NULL,
    "voterEmail" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "VoteStatus" NOT NULL DEFAULT 'FREE',
    "transactionRef" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vote_transactionRef_key" ON "Vote"("transactionRef");

-- CreateIndex
CREATE INDEX "Vote_eventId_categoryId_idx" ON "Vote"("eventId", "categoryId");

-- CreateIndex
CREATE INDEX "Vote_contestantId_idx" ON "Vote"("contestantId");

-- CreateIndex
CREATE INDEX "Vote_voterEmail_idx" ON "Vote"("voterEmail");

-- CreateIndex
CREATE INDEX "Vote_eventId_status_createdAt_idx" ON "Vote"("eventId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EventCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
