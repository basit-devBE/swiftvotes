import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { PAYMENTS_REPOSITORY, VOTES_REPOSITORY } from "../votes.tokens";
import {
  PaymentSummary,
  PaymentsRepository,
} from "../ports/payments.repository";
import { VotesRepository, VotesSummary } from "../ports/votes.repository";

export type EventVotesSummary = {
  votes: VotesSummary;
  payments: PaymentSummary;
};

@Injectable()
export class GetEventVotesSummaryUseCase {
  constructor(
    @Inject(VOTES_REPOSITORY)
    private readonly votesRepository: VotesRepository,
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(eventId: string): Promise<EventVotesSummary> {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    const [votes, payments] = await Promise.all([
      this.votesRepository.summarize(eventId),
      this.paymentsRepository.summarize(eventId),
    ]);

    return { votes, payments };
  }
}
