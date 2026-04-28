import { Inject, Injectable } from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";
import { Event } from "../../domain/event";

@Injectable()
export class ListApprovedEventsUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  execute(): Promise<Event[]> {
    return this.eventsRepository.findApproved();
  }
}
