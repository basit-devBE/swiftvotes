import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { EventType } from "../../../events/domain/event-type";
import { TicketType } from "../../domain/ticket-type";
import { TICKETING_REPOSITORY } from "../ticketing.tokens";
import { TicketingRepository } from "../ports/ticketing.repository";

const MIN_TICKET_PRICE_MINOR = 50;

export type CreateTicketTypeUseCaseInput = {
  eventId: string;
  name: string;
  description?: string | null;
  priceMinor: number;
  currency: string;
  quantityAvailable?: number | null;
  salesStartAt?: Date | null;
  salesEndAt?: Date | null;
  sortOrder?: number;
};

@Injectable()
export class CreateTicketTypeUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(TICKETING_REPOSITORY)
    private readonly ticketingRepository: TicketingRepository,
  ) {}

  async execute(input: CreateTicketTypeUseCaseInput): Promise<TicketType> {
    const event = await this.eventsRepository.findById(input.eventId);
    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    if (event.eventType !== EventType.TICKETING) {
      throw new BadRequestException("Ticket types can only be added to ticketing events.");
    }

    this.validateTicketType(input);

    return this.ticketingRepository.createTicketType({
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      currency: input.currency.trim().toUpperCase(),
    });
  }

  private validateTicketType(input: CreateTicketTypeUseCaseInput): void {
    if (!input.name.trim()) {
      throw new BadRequestException("Ticket type name is required.");
    }

    if (!Number.isInteger(input.priceMinor) || input.priceMinor < MIN_TICKET_PRICE_MINOR) {
      throw new BadRequestException("Ticket price must be at least GHS 0.50.");
    }

    if (
      input.quantityAvailable !== undefined &&
      input.quantityAvailable !== null &&
      (!Number.isInteger(input.quantityAvailable) || input.quantityAvailable < 1)
    ) {
      throw new BadRequestException("Ticket quantity must be at least 1 when set.");
    }

    if (
      input.salesStartAt &&
      input.salesEndAt &&
      input.salesStartAt >= input.salesEndAt
    ) {
      throw new BadRequestException("Ticket sales start must be before sales end.");
    }
  }
}
