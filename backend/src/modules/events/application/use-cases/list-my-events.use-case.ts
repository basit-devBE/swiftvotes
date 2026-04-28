import { Inject, Injectable } from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";
import { Event } from "../../domain/event";

@Injectable()
export class ListMyEventsUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  execute(userId: string): Promise<Event[]> {
    return this.eventsRepository.findMine(userId);
  }
}
