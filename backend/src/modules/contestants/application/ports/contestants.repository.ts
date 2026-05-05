import { EventStatus } from "../../../events/domain/event-status";
import { Contestant } from "../../domain/contestant";

export type ContestantWithContext = Contestant & {
  event: {
    id: string;
    name: string;
    slug: string;
    status: EventStatus;
    contestantsCanViewOwnVotes: boolean;
    contestantsCanViewLeaderboard: boolean;
    votingStartAt: Date;
    votingEndAt: Date;
    primaryFlyerUrl: string;
    bannerUrl: string | null;
  };
  category: {
    id: string;
    name: string;
  };
};

export type UpdateContestantDetailsRecord = {
  categoryId?: string;
  name?: string;
  phone?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
};

export interface ContestantsRepository {
  createFromNomination(input: {
    eventId: string;
    categoryId: string;
    nominationId: string;
    codePrefix: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    imageUrl?: string | null;
    imageKey?: string | null;
  }): Promise<Contestant>;
  findByEvent(eventId: string): Promise<Contestant[]>;
  findByEventAndCategory(eventId: string, categoryId: string): Promise<Contestant[]>;
  findById(contestantId: string): Promise<Contestant | null>;
  updateDetails(
    contestantId: string,
    input: UpdateContestantDetailsRecord,
  ): Promise<Contestant>;
  updateUserId(contestantId: string, userId: string): Promise<Contestant>;
  findWithContextByUserId(userId: string): Promise<ContestantWithContext[]>;
}
