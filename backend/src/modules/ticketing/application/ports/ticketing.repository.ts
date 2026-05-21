import { Prisma } from "@prisma/client";

import { TicketOrder, TicketPayment } from "../../domain/ticket-order";
import { TicketPaymentStatus } from "../../domain/ticket-payment-status";
import { TicketType } from "../../domain/ticket-type";

export type CreateTicketTypeInput = {
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

export type UpdateTicketTypeInput = Partial<
  Omit<CreateTicketTypeInput, "eventId">
> & {
  isActive?: boolean;
};

export type CreatePendingTicketOrderInput = {
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  totalAmountMinor: number;
  currency: string;
  payment: {
    reference: string;
    amountMinor: number;
    rawInitResponse?: Prisma.InputJsonValue | null;
    metadata?: Prisma.InputJsonValue | null;
    customerIp?: string | null;
    provider?: string;
    providerRef?: string | null;
    channel?: string | null;
    mobileNumber?: string | null;
  };
  items: Array<{
    ticketTypeId: string;
    quantity: number;
    unitPriceMinor: number;
    totalAmountMinor: number;
  }>;
};

export type MarkTicketPaymentSucceededInput = {
  reference: string;
  providerRef?: string | null;
  amountPaidMinor?: number | null;
  feeMinor?: number | null;
  paidAt: Date;
  channel?: string | null;
  cardLast4?: string | null;
  mobileNumber?: string | null;
  rawVerifyResponse?: Prisma.InputJsonValue | null;
};

export type MarkTicketPaymentSucceededResult = {
  order: TicketOrder;
  issuedNow: boolean;
};

export type MarkTicketPaymentFailedInput = {
  reference: string;
  providerRef?: string | null;
  failureReason: string;
  failedAt: Date;
  rawVerifyResponse?: Prisma.InputJsonValue | null;
};

export type UpdateTicketPaymentInitializationInput = {
  reference: string;
  providerRef?: string | null;
  rawInitResponse?: Prisma.InputJsonValue | null;
};

export type RecordTicketWebhookEventInput = {
  reference: string;
  eventType: string;
  signatureValid: boolean;
  rawPayload: Prisma.InputJsonValue;
  ticketPaymentId?: string | null;
};

export type TicketPaymentWebhookEvent = {
  id: string;
  ticketPaymentId: string | null;
  provider: string;
  eventType: string;
  reference: string;
  signatureValid: boolean;
  receivedAt: Date;
  processed: boolean;
  processedAt: Date | null;
};

export type RedeemedIssuedTicket = {
  id: string;
  eventId: string;
  eventName: string;
  orderId: string;
  orderReference: string | null;
  buyerName: string;
  buyerEmail: string;
  ticketTypeName: string;
  code: string;
  status: string;
  checkedInAt: Date | null;
  checkedInById: string | null;
  createdAt: Date;
};

export interface TicketingRepository {
  createTicketType(input: CreateTicketTypeInput): Promise<TicketType>;
  updateTicketType(
    ticketTypeId: string,
    input: UpdateTicketTypeInput,
  ): Promise<TicketType>;
  findTicketTypeById(ticketTypeId: string): Promise<TicketType | null>;
  listTicketTypes(eventId: string, includeInactive?: boolean): Promise<TicketType[]>;
  disableTicketType(ticketTypeId: string): Promise<void>;

  createPendingOrder(input: CreatePendingTicketOrderInput): Promise<TicketOrder>;
  findOrderById(orderId: string): Promise<TicketOrder | null>;
  findPaymentByReference(reference: string): Promise<TicketPayment | null>;
  findOrderByPaymentReference(reference: string): Promise<TicketOrder | null>;
  updatePaymentInitialization(
    input: UpdateTicketPaymentInitializationInput,
  ): Promise<TicketPayment>;
  markPaymentSucceededAndIssueTickets(
    input: MarkTicketPaymentSucceededInput,
  ): Promise<MarkTicketPaymentSucceededResult>;
  markPaymentFailed(input: MarkTicketPaymentFailedInput): Promise<TicketOrder>;
  getPaymentStatus(reference: string): Promise<TicketPaymentStatus | null>;

  recordWebhookEvent(
    input: RecordTicketWebhookEventInput,
  ): Promise<TicketPaymentWebhookEvent>;
  markWebhookProcessed(eventId: string): Promise<void>;
  redeemIssuedTicket(input: {
    eventId: string;
    code: string;
    checkedInById: string;
  }): Promise<RedeemedIssuedTicket>;
}
