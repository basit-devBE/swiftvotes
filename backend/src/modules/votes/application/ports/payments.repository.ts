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
}
