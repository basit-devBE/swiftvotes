import { CastVoteResult } from "../../../application/use-cases/cast-vote.use-case";
import { VoteStatus } from "../../../domain/vote-status";

export class CastVoteResponseDto {
  type!: "free" | "payment";
  voteId!: string;
  status!: VoteStatus;
  quantity!: number;
  amountMinor!: number;
  currency!: string;
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
        paymentUrl: null,
      };
    }
    return {
      type: "payment",
      voteId: result.voteId,
      status: VoteStatus.PENDING_PAYMENT,
      quantity: 0,
      amountMinor: 0,
      currency: "",
      paymentUrl: result.paymentUrl,
    };
  }
}
