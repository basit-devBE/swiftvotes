-- Contestant codes are used directly in the USSD flow, so they must identify
-- exactly one contestant without requiring the voter to choose an event first.

DROP INDEX IF EXISTS "Contestant_eventId_code_key";

CREATE UNIQUE INDEX "Contestant_code_key" ON "Contestant"("code");
