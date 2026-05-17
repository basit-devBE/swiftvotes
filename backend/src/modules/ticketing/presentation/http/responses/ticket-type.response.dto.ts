import { TicketType } from "../../../domain/ticket-type";

export class TicketTypeResponseDto {
  id!: string;
  eventId!: string;
  name!: string;
  description!: string | null;
  priceMinor!: number;
  currency!: string;
  quantityAvailable!: number | null;
  quantitySold!: number;
  salesStartAt!: Date | null;
  salesEndAt!: Date | null;
  isActive!: boolean;
  sortOrder!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static fromDomain(ticketType: TicketType): TicketTypeResponseDto {
    return {
      id: ticketType.id,
      eventId: ticketType.eventId,
      name: ticketType.name,
      description: ticketType.description,
      priceMinor: ticketType.priceMinor,
      currency: ticketType.currency,
      quantityAvailable: ticketType.quantityAvailable,
      quantitySold: ticketType.quantitySold,
      salesStartAt: ticketType.salesStartAt,
      salesEndAt: ticketType.salesEndAt,
      isActive: ticketType.isActive,
      sortOrder: ticketType.sortOrder,
      createdAt: ticketType.createdAt,
      updatedAt: ticketType.updatedAt,
    };
  }
}
