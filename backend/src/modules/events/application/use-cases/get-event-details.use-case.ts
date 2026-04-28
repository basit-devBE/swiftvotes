import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";
import { Event } from "../../domain/event";

@Injectable()
export class GetEventDetailsUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(eventId: string): Promise<Event> {
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    return event;
  }
}
