-- Add nominator's phone and relax submitterEmail to optional. Both contact requirements
-- (nominator phone, nominee phone) are enforced at the API/form layer rather than via
-- NOT NULL so existing rows aren't invalidated.

ALTER TABLE "Nomination"
  ADD COLUMN "submitterPhone" TEXT;

ALTER TABLE "Nomination"
  ALTER COLUMN "submitterEmail" DROP NOT NULL;
