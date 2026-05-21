ALTER TABLE "Contestant" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Contestant" ADD COLUMN "deletedByUserId" TEXT;
CREATE INDEX "Contestant_eventId_deletedAt_idx" ON "Contestant"("eventId", "deletedAt");
