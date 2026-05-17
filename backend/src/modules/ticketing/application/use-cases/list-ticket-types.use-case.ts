import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { TicketType } from "../../domain/ticket-type";
import { TICKETING_REPOSITORY } from "../ticketing.tokens";
import { TicketingRepository } from "../ports/ticketing.repository";

@Injectable()
export class ListTicketTypesUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(TICKETING_REPOSITORY)
    private readonly ticketingRepository: TicketingRepository,
  ) {}

  async execute(eventId: string, includeInactive = false): Promise<TicketType[]> {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) {
      throw new NotFoundException("Event not found.");
    }
    return this.ticketingRepository.listTicketTypes(eventId, includeInactive);
  }
}
