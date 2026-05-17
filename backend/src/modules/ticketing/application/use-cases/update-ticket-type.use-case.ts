import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { TicketType } from "../../domain/ticket-type";
import { TICKETING_REPOSITORY } from "../ticketing.tokens";
import { TicketingRepository } from "../ports/ticketing.repository";

export type UpdateTicketTypeUseCaseInput = {
  eventId: string;
  ticketTypeId: string;
  name?: string;
  description?: string | null;
  priceMinor?: number;
  currency?: string;
  quantityAvailable?: number | null;
  salesStartAt?: Date | null;
  salesEndAt?: Date | null;
  isActive?: boolean;
  sortOrder?: number;
};

@Injectable()
export class UpdateTicketTypeUseCase {
  constructor(
    @Inject(TICKETING_REPOSITORY)
    private readonly ticketingRepository: TicketingRepository,
  ) {}

  async execute(input: UpdateTicketTypeUseCaseInput): Promise<TicketType> {
    const ticketType = await this.ticketingRepository.findTicketTypeById(
      input.ticketTypeId,
    );
    if (!ticketType) {
      throw new NotFoundException("Ticket type not found.");
    }

    if (ticketType.eventId !== input.eventId) {
      throw new NotFoundException("Ticket type not found for this event.");
    }

    const nextQuantityAvailable =
      input.quantityAvailable === undefined
        ? ticketType.quantityAvailable
        : input.quantityAvailable;

    if (input.name !== undefined && !input.name.trim()) {
      throw new BadRequestException("Ticket type name is required.");
    }

    if (
      input.priceMinor !== undefined &&
      (!Number.isInteger(input.priceMinor) || input.priceMinor < 50)
    ) {
      throw new BadRequestException("Ticket price must be at least GHS 0.50.");
    }

    if (
      nextQuantityAvailable !== null &&
      nextQuantityAvailable < ticketType.quantitySold
    ) {
      throw new BadRequestException(
        "Ticket quantity cannot be lower than the number already sold.",
      );
    }

    const nextSalesStartAt =
      input.salesStartAt === undefined
        ? ticketType.salesStartAt
        : input.salesStartAt;
    const nextSalesEndAt =
      input.salesEndAt === undefined ? ticketType.salesEndAt : input.salesEndAt;

    if (nextSalesStartAt && nextSalesEndAt && nextSalesStartAt >= nextSalesEndAt) {
      throw new BadRequestException("Ticket sales start must be before sales end.");
    }

    return this.ticketingRepository.updateTicketType(input.ticketTypeId, {
      name: input.name?.trim(),
      description:
        input.description === undefined ? undefined : input.description?.trim() || null,
      priceMinor: input.priceMinor,
      currency: input.currency?.trim().toUpperCase(),
      quantityAvailable: input.quantityAvailable,
      salesStartAt: input.salesStartAt,
      salesEndAt: input.salesEndAt,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
    });
  }
}
