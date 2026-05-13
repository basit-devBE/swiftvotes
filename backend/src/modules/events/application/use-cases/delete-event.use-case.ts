import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";

@Injectable()
export class DeleteEventUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(eventId: string): Promise<void> {
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    await this.eventsRepository.deleteEvent(eventId);
  }
}
