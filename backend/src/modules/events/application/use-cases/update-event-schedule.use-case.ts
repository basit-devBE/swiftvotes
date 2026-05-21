import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { Event } from "../../domain/event";
import { determineEventStatusForTimestamp } from "../../domain/event-lifecycle";
import { EventStatus } from "../../domain/event-status";
import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";
import { validateUpdateEventInput } from "./event-validation";

export type UpdateEventScheduleInput = {
  eventId: string;
  nominationStartAt?: Date | null;
  nominationEndAt?: Date | null;
  votingStartAt?: Date;
  votingEndAt?: Date;
  ticketSalesStartAt?: Date | null;
  ticketSalesEndAt?: Date | null;
  eventStartAt?: Date | null;
  eventEndAt?: Date | null;
  venueName?: string | null;
  venueAddress?: string | null;
};

@Injectable()
export class UpdateEventScheduleUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(input: UpdateEventScheduleInput): Promise<Event> {
    const event = await this.eventsRepository.findById(input.eventId);
    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    validateUpdateEventInput(event, input);
    this.assertVotingDoesNotRegress(event, input, new Date());

    const updated = await this.eventsRepository.updateDraft(input.eventId, {
      nominationStartAt: input.nominationStartAt,
      nominationEndAt: input.nominationEndAt,
      votingStartAt: input.votingStartAt,
      votingEndAt: input.votingEndAt,
      ticketSalesStartAt: input.ticketSalesStartAt,
      ticketSalesEndAt: input.ticketSalesEndAt,
      eventStartAt: input.eventStartAt,
      eventEndAt: input.eventEndAt,
      venueName: input.venueName,
      venueAddress: input.venueAddress,
    });

    const nextStatus = this.deriveStatusAfterScheduleUpdate(updated, new Date());
    if (nextStatus !== updated.status) {
      return this.eventsRepository.updateStatus({
        eventId: updated.id,
        status: nextStatus,
      });
    }

    return updated;
  }

  private assertVotingDoesNotRegress(
    event: Event,
    input: UpdateEventScheduleInput,
    now: Date,
  ): void {
    if (!event.hasVoting) return;

    const votingHasStarted =
      event.status === EventStatus.VOTING_LIVE ||
      event.status === EventStatus.VOTING_CLOSED ||
      event.votingStartAt <= now;

    if (!votingHasStarted) return;

    if (
      input.nominationStartAt !== undefined ||
      input.nominationEndAt !== undefined
    ) {
      throw new BadRequestException(
        "Nominations cannot be reopened or rescheduled after voting has started.",
      );
    }

    if (input.votingStartAt && input.votingStartAt.getTime() !== event.votingStartAt.getTime()) {
      throw new BadRequestException(
        "Voting start time cannot be changed after voting has started.",
      );
    }
  }

  private deriveStatusAfterScheduleUpdate(event: Event, now: Date): EventStatus {
    if (
      [
        EventStatus.DRAFT,
        EventStatus.PENDING_APPROVAL,
        EventStatus.REJECTED,
        EventStatus.ARCHIVED,
      ].includes(event.status)
    ) {
      return event.status;
    }

    const derived = determineEventStatusForTimestamp(event, now);

    if (
      event.status === EventStatus.VOTING_LIVE &&
      [
        EventStatus.APPROVED,
        EventStatus.NOMINATIONS_OPEN,
        EventStatus.NOMINATIONS_CLOSED,
        EventStatus.VOTING_SCHEDULED,
      ].includes(derived)
    ) {
      return EventStatus.VOTING_LIVE;
    }

    if (
      event.status === EventStatus.VOTING_CLOSED &&
      [
        EventStatus.APPROVED,
        EventStatus.NOMINATIONS_OPEN,
        EventStatus.NOMINATIONS_CLOSED,
        EventStatus.VOTING_SCHEDULED,
      ].includes(derived)
    ) {
      return EventStatus.VOTING_CLOSED;
    }

    return derived;
  }
}
