import { RedeemedIssuedTicket } from "../../../application/ports/ticketing.repository";

export class RedeemedIssuedTicketResponseDto {
  id!: string;
  eventId!: string;
  eventName!: string;
  orderId!: string;
  orderReference!: string | null;
  buyerName!: string;
  buyerEmail!: string;
  ticketTypeName!: string;
  code!: string;
  status!: string;
  checkedInAt!: Date | null;
  checkedInById!: string | null;
  createdAt!: Date;

  static fromDomain(ticket: RedeemedIssuedTicket): RedeemedIssuedTicketResponseDto {
    return {
      id: ticket.id,
      eventId: ticket.eventId,
      eventName: ticket.eventName,
      orderId: ticket.orderId,
      orderReference: ticket.orderReference,
      buyerName: ticket.buyerName,
      buyerEmail: ticket.buyerEmail,
      ticketTypeName: ticket.ticketTypeName,
      code: ticket.code,
      status: ticket.status,
      checkedInAt: ticket.checkedInAt,
      checkedInById: ticket.checkedInById,
      createdAt: ticket.createdAt,
    };
  }
}
