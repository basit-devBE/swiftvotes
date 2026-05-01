-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "contestantsCanViewLeaderboard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contestantsCanViewOwnVotes" BOOLEAN NOT NULL DEFAULT false;
