import { CastVoteResult } from "../../../application/use-cases/cast-vote.use-case";
import { VoteStatus } from "../../../domain/vote-status";

export class CastVoteResponseDto {
  type!: "free" | "payment";
  voteId!: string;
  status!: VoteStatus;
  quantity!: number;
  amountMinor!: number;
  currency!: string;
  reference!: string | null;
  paymentUrl!: string | null;

  static fromResult(result: CastVoteResult): CastVoteResponseDto {
    if (result.type === "free") {
      return {
        type: "free",
        voteId: result.vote.id,
        status: result.vote.status,
        quantity: result.vote.quantity,
        amountMinor: result.vote.amountMinor,
        currency: result.vote.currency,
        reference: null,
        paymentUrl: null,
      };
    }
    return {
      type: "payment",
      voteId: result.voteId,
      status: VoteStatus.PENDING_PAYMENT,
      quantity: result.quantity,
      amountMinor: result.amountMinor,
      currency: result.currency,
      reference: result.reference,
      paymentUrl: result.paymentUrl,
    };
  }
}
