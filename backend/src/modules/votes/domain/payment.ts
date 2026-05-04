import { PaymentStatus } from "./payment-status";

export type Payment = {
  id: string;
  reference: string;
  providerRef: string | null;
  provider: string;

  amountMinor: number;
  amountPaidMinor: number | null;
  feeMinor: number | null;
  currency: string;

  status: PaymentStatus;
  initializedAt: Date;
  paidAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;

  voterEmail: string;
  voterName: string | null;
  channel: string | null;
  cardLast4: string | null;
  mobileNumber: string | null;
  customerIp: string | null;

  eventId: string;
  categoryId: string;
  contestantId: string;
  voteId: string | null;

  rawInitResponse: unknown;
  rawVerifyResponse: unknown;
  metadata: unknown;

  createdAt: Date;
  updatedAt: Date;
};

export type PaymentWebhookEvent = {
  id: string;
  paymentId: string | null;
  provider: string;
  eventType: string;
  reference: string;
  signatureValid: boolean;
  rawPayload: unknown;
  receivedAt: Date;
  processed: boolean;
  processedAt: Date | null;
};
