import {
  IssuedTicket,
  TicketOrder,
  TicketOrderItem,
  TicketPayment,
} from "../../../domain/ticket-order";

export class TicketOrderItemResponseDto {
  id!: string;
  orderId!: string;
  ticketTypeId!: string;
  ticketTypeName!: string | null;
  quantity!: number;
  unitPriceMinor!: number;
  totalAmountMinor!: number;
  createdAt!: Date;

  static fromDomain(item: TicketOrderItem): TicketOrderItemResponseDto {
    return { ...item };
  }
}

export class IssuedTicketResponseDto {
  id!: string;
  eventId!: string;
  orderId!: string;
  orderItemId!: string;
  ticketTypeId!: string;
  code!: string;
  status!: string;
  checkedInAt!: Date | null;
  checkedInById!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromDomain(ticket: IssuedTicket): IssuedTicketResponseDto {
    return { ...ticket };
  }
}

export class TicketPaymentResponseDto {
  id!: string;
  orderId!: string;
  reference!: string;
  providerRef!: string | null;
  provider!: string;
  amountMinor!: number;
  amountPaidMinor!: number | null;
  feeMinor!: number | null;
  currency!: string;
  status!: string;
  initializedAt!: Date;
  paidAt!: Date | null;
  failedAt!: Date | null;
  failureReason!: string | null;
  buyerEmail!: string;
  buyerName!: string | null;
  buyerPhone!: string | null;
  channel!: string | null;
  cardLast4!: string | null;
  mobileNumber!: string | null;
  customerIp!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromDomain(payment: TicketPayment): TicketPaymentResponseDto {
    return { ...payment };
  }
}

export class TicketOrderResponseDto {
  id!: string;
  eventId!: string;
  buyerName!: string;
  buyerEmail!: string;
  buyerPhone!: string | null;
  status!: string;
  totalAmountMinor!: number;
  currency!: string;
  createdAt!: Date;
  updatedAt!: Date;
  items!: TicketOrderItemResponseDto[];
  payment!: TicketPaymentResponseDto | null;
  issuedTickets!: IssuedTicketResponseDto[];

  static fromDomain(order: TicketOrder): TicketOrderResponseDto {
    return {
      id: order.id,
      eventId: order.eventId,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      buyerPhone: order.buyerPhone,
      status: order.status,
      totalAmountMinor: order.totalAmountMinor,
      currency: order.currency,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => TicketOrderItemResponseDto.fromDomain(item)),
      payment: order.payment
        ? TicketPaymentResponseDto.fromDomain(order.payment)
        : null,
      issuedTickets: order.issuedTickets.map((ticket) =>
        IssuedTicketResponseDto.fromDomain(ticket),
      ),
    };
  }
}

export class CreateTicketOrderResponseDto {
  order!: TicketOrderResponseDto;
  reference!: string;
  paymentUrl!: string | null;

  static fromResult(input: {
    order: TicketOrder;
    reference: string;
    paymentUrl: string | null;
  }): CreateTicketOrderResponseDto {
    return {
      order: TicketOrderResponseDto.fromDomain(input.order),
      reference: input.reference,
      paymentUrl: input.paymentUrl,
    };
  }
}
