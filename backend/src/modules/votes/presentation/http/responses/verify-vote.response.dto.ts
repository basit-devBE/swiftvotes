import { Vote } from "../../../domain/vote";
import { VoteStatus } from "../../../domain/vote-status";

export class VerifyVoteResponseDto {
  voteId!: string;
  status!: VoteStatus;
  eventId!: string;
  contestantId!: string;
  categoryId!: string;
  quantity!: number;
  amountMinor!: number;
  currency!: string;
  reference!: string | null;

  static fromDomain(vote: Vote): VerifyVoteResponseDto {
    return {
      voteId: vote.id,
      status: vote.status,
      eventId: vote.eventId,
      contestantId: vote.contestantId,
      categoryId: vote.categoryId,
      quantity: vote.quantity,
      amountMinor: vote.amountMinor,
      currency: vote.currency,
      reference: vote.transactionRef,
    };
  }
}
