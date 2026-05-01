import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from "@nestjs/common";

import { CONTESTANTS_REPOSITORY } from "../../../contestants/application/contestants.tokens";
import { ContestantsRepository } from "../../../contestants/application/ports/contestants.repository";
import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { EventStatus } from "../../../events/domain/event-status";
import { Vote } from "../../domain/vote";
import { VoteStatus } from "../../domain/vote-status";
import { VOTES_REPOSITORY } from "../votes.tokens";
import { VotesRepository } from "../ports/votes.repository";

export type CastVoteInput = {
  eventId: string;
  contestantId: string;
  quantity: number;
  voterName: string;
  voterEmail: string;
  ipAddress?: string | null;
};

export type CastVoteResult =
  | { type: "free"; vote: Vote }
  | { type: "payment"; voteId: string; paymentUrl: string };

@Injectable()
export class CastVoteUseCase {
  constructor(
    @Inject(VOTES_REPOSITORY)
    private readonly votesRepository: VotesRepository,
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
  ) {}

  async execute(input: CastVoteInput): Promise<CastVoteResult> {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new BadRequestException("Quantity must be a positive integer.");
    }

    const event = await this.eventsRepository.findById(input.eventId);
    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    if (event.status !== EventStatus.VOTING_LIVE) {
      throw new ConflictException("Voting is not currently live for this event.");
    }

    const contestant = await this.contestantsRepository.findById(input.contestantId);
    if (!contestant) {
      throw new NotFoundException("Contestant not found.");
    }

    if (contestant.eventId !== event.id) {
      throw new BadRequestException("Contestant does not belong to this event.");
    }

    const category = event.categories.find((c) => c.id === contestant.categoryId);
    if (!category) {
      throw new NotFoundException("Category not found for this contestant.");
    }

    const voterName = input.voterName.trim();
    const voterEmail = input.voterEmail.trim().toLowerCase();

    if (category.votePriceMinor === 0) {
      const vote = await this.votesRepository.create({
        eventId: event.id,
        categoryId: category.id,
        contestantId: contestant.id,
        voterName,
        voterEmail,
        quantity: input.quantity,
        amountMinor: 0,
        currency: category.currency,
        status: VoteStatus.FREE,
        ipAddress: input.ipAddress ?? null,
      });
      return { type: "free", vote };
    }

    // Paid path is implemented in a later step (Paystack integration).
    throw new NotImplementedException(
      "Paid voting is not yet available. Please try again later.",
    );
  }
}
