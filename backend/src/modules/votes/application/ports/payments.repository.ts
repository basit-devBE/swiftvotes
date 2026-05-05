import { Prisma } from "@prisma/client";

import { PaymentStatus } from "../../domain/payment-status";
import { Payment, PaymentWebhookEvent } from "../../domain/payment";

export type CreatePendingPaymentInput = {
  reference: string;
  amountMinor: number;
  currency: string;

  voterEmail: string;
  voterName?: string | null;
  customerIp?: string | null;

  eventId: string;
  categoryId: string;
  contestantId: string;

  rawInitResponse?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
};

export type MarkPaymentSucceededInput = {
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

export type MarkPaymentFailedInput = {
  reference: string;
  providerRef?: string | null;
  failureReason: string;
  failedAt: Date;
  rawVerifyResponse?: Prisma.InputJsonValue | null;
};

export type RecordWebhookEventInput = {
  reference: string;
  eventType: string;
  signatureValid: boolean;
  rawPayload: Prisma.InputJsonValue;
  paymentId?: string | null;
};

export type ListPaymentsFilters = {
  status?: PaymentStatus;
  from?: Date;
  to?: Date;
};

export type ListPaymentsInput = {
  eventId: string;
  filters: ListPaymentsFilters;
  page: number;
  pageSize: number;
};

export type ListPaymentsResult = {
  rows: Payment[];
  total: number;
  page: number;
  pageSize: number;
};

export type PaymentWithContext = Payment & {
  contestantName: string | null;
  contestantCode: string | null;
  categoryName: string | null;
};

export type PaymentDetail = {
  payment: Payment;
  webhookEvents: PaymentWebhookEvent[];
};

export type ChannelBreakdownEntry = {
  channel: string;
  count: number;
  totalAmountMinor: number;
};

export type StatusBreakdownEntry = {
  status: PaymentStatus;
  count: number;
};

export type PaymentSummary = {
  totalCount: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
  abandonedCount: number;
  refundedCount: number;
  grossMinor: number;
  feesMinor: number;
  netMinor: number;
  currency: string | null;
  byStatus: StatusBreakdownEntry[];
  byChannel: ChannelBreakdownEntry[];
};

export interface PaymentsRepository {
  createPending(
    input: CreatePendingPaymentInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment>;

  findByReference(reference: string): Promise<Payment | null>;

  linkVote(
    paymentId: string,
    voteId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment>;

  markSucceeded(
    input: MarkPaymentSucceededInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment>;

  markFailed(
    input: MarkPaymentFailedInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment>;

  recordWebhookEvent(
    input: RecordWebhookEventInput,
  ): Promise<PaymentWebhookEvent>;

  markWebhookProcessed(eventId: string): Promise<void>;

  // Re-exposed for callers that need to know the current status without re-fetching.
  getStatus(reference: string): Promise<PaymentStatus | null>;

  list(input: ListPaymentsInput): Promise<ListPaymentsResult>;

  findDetailById(paymentId: string): Promise<PaymentDetail | null>;

  summarize(eventId: string, filters?: ListPaymentsFilters): Promise<PaymentSummary>;
}
