import { TicketOrderStatus } from "./ticket-order-status";
import { TicketPaymentStatus } from "./ticket-payment-status";

export type TicketOrderItem = {
  id: string;
  orderId: string;
  ticketTypeId: string;
  ticketTypeName: string | null;
  quantity: number;
  unitPriceMinor: number;
  totalAmountMinor: number;
  createdAt: Date;
};

export type IssuedTicket = {
  id: string;
  eventId: string;
  orderId: string;
  orderItemId: string;
  ticketTypeId: string;
  code: string;
  status: string;
  checkedInAt: Date | null;
  checkedInById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TicketPayment = {
  id: string;
  orderId: string;
  reference: string;
  providerRef: string | null;
  provider: string;
  amountMinor: number;
  amountPaidMinor: number | null;
  feeMinor: number | null;
  currency: string;
  status: TicketPaymentStatus;
  initializedAt: Date;
  paidAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  buyerEmail: string;
  buyerName: string | null;
  buyerPhone: string | null;
  channel: string | null;
  cardLast4: string | null;
  mobileNumber: string | null;
  customerIp: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TicketOrder = {
  id: string;
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  status: TicketOrderStatus;
  totalAmountMinor: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  items: TicketOrderItem[];
  payment: TicketPayment | null;
  issuedTickets: IssuedTicket[];
};
