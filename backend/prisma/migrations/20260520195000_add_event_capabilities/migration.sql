ALTER TABLE "Event"
ADD COLUMN "hasVoting" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "hasTicketing" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Event"
SET
  "hasVoting" = CASE WHEN "eventType" = 'VOTING' THEN true ELSE false END,
  "hasTicketing" = CASE WHEN "eventType" = 'TICKETING' THEN true ELSE false END;
