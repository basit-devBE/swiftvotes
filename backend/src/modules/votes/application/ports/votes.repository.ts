import { Prisma } from "@prisma/client";

import { VoteStatus } from "../../domain/vote-status";
import { Vote } from "../../domain/vote";

export type CreateVoteInput = {
  eventId: string;
  categoryId: string;
  contestantId: string;
  voterName: string;
  voterEmail: string;
  quantity: number;
  amountMinor: number;
  currency: string;
  status: VoteStatus;
  transactionRef?: string | null;
  ipAddress?: string | null;
};

export type ContestantVoteCount = {
  contestantId: string;
  totalVotes: number;
};

export interface VotesRepository {
  create(input: CreateVoteInput, tx?: Prisma.TransactionClient): Promise<Vote>;
  findById(voteId: string): Promise<Vote | null>;
  findByTransactionRef(transactionRef: string): Promise<Vote | null>;
  updateStatus(
    voteId: string,
    status: VoteStatus,
    transactionRef?: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<Vote>;
  countByContestant(contestantId: string): Promise<number>;
  countsByEvent(eventId: string): Promise<ContestantVoteCount[]>;
  countsByEventCategory(
    eventId: string,
    categoryId: string,
  ): Promise<ContestantVoteCount[]>;
  listByEvent(eventId: string): Promise<Vote[]>;
  findRecentFreeVoteByIp(input: {
    contestantId: string;
    ipAddress: string;
    since: Date;
  }): Promise<Vote | null>;
}
