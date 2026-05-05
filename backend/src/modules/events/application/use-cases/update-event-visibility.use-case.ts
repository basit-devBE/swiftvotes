import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";
import { Event } from "../../domain/event";

export type UpdateEventVisibilityInput = {
  eventId: string;
  contestantsCanViewOwnVotes?: boolean;
  contestantsCanViewLeaderboard?: boolean;
  publicCanViewLeaderboard?: boolean;
};

@Injectable()
export class UpdateEventVisibilityUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(input: UpdateEventVisibilityInput): Promise<Event> {
    const event = await this.eventsRepository.findById(input.eventId);

    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    return this.eventsRepository.updateVisibility(input.eventId, {
      contestantsCanViewOwnVotes: input.contestantsCanViewOwnVotes,
      contestantsCanViewLeaderboard: input.contestantsCanViewLeaderboard,
      publicCanViewLeaderboard: input.publicCanViewLeaderboard,
    });
  }
}
