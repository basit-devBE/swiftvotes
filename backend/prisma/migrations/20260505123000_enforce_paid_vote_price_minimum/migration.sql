-- Normalize any existing paid categories below the floor, then enforce:
-- 0 = free voting; paid voting starts at 50 pesewas (GHS 0.50).
UPDATE "EventCategory"
SET "votePriceMinor" = 50
WHERE "votePriceMinor" > 0 AND "votePriceMinor" < 50;

ALTER TABLE "EventCategory"
ADD CONSTRAINT "EventCategory_votePrice_paid_min_check"
CHECK ("votePriceMinor" = 0 OR "votePriceMinor" >= 50);
