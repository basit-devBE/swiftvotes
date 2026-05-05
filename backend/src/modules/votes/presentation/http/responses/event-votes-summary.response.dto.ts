import { EventVotesSummary } from "../../../application/use-cases/get-event-votes-summary.use-case";
import { PaymentSummaryResponseDto } from "./payment.response.dto";

export class EventVotesSummaryResponseDto {
  votes!: {
    totalVotes: number;
    freeVotes: number;
    paidVotes: number;
    uniqueVoters: number;
  };
  payments!: PaymentSummaryResponseDto;

  static fromDomain(summary: EventVotesSummary): EventVotesSummaryResponseDto {
    return {
      votes: { ...summary.votes },
      payments: PaymentSummaryResponseDto.fromDomain(summary.payments),
    };
  }
}
