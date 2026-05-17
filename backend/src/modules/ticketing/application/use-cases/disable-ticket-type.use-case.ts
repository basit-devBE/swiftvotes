import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { TICKETING_REPOSITORY } from "../ticketing.tokens";
import { TicketingRepository } from "../ports/ticketing.repository";

@Injectable()
export class DisableTicketTypeUseCase {
  constructor(
    @Inject(TICKETING_REPOSITORY)
    private readonly ticketingRepository: TicketingRepository,
  ) {}

  async execute(input: { eventId: string; ticketTypeId: string }): Promise<void> {
    const ticketType = await this.ticketingRepository.findTicketTypeById(
      input.ticketTypeId,
    );
    if (!ticketType) {
      throw new NotFoundException("Ticket type not found.");
    }
    if (ticketType.eventId !== input.eventId) {
      throw new NotFoundException("Ticket type not found for this event.");
    }
    await this.ticketingRepository.disableTicketType(input.ticketTypeId);
  }
}
