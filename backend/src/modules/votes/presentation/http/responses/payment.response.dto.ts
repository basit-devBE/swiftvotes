import { Payment, PaymentWebhookEvent } from "../../../domain/payment";
import {
  PaymentSummary,
  PaymentWithContext,
} from "../../../application/ports/payments.repository";
import { PaymentDetailWithContext } from "../../../application/use-cases/get-payment-detail.use-case";
import { ListEventPaymentsResult } from "../../../application/use-cases/list-event-payments.use-case";

export class PaymentResponseDto {
  id!: string;
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
  voterEmail!: string;
  voterName!: string | null;
  channel!: string | null;
  cardLast4!: string | null;
  mobileNumber!: string | null;
  customerIp!: string | null;
  eventId!: string;
  categoryId!: string;
  categoryName!: string | null;
  contestantId!: string;
  contestantName!: string | null;
  contestantCode!: string | null;
  voteId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromDomain(payment: Payment | PaymentWithContext): PaymentResponseDto {
    return {
      id: payment.id,
      reference: payment.reference,
      providerRef: payment.providerRef,
      provider: payment.provider,
      amountMinor: payment.amountMinor,
      amountPaidMinor: payment.amountPaidMinor,
      feeMinor: payment.feeMinor,
      currency: payment.currency,
      status: payment.status,
      initializedAt: payment.initializedAt,
      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      failureReason: payment.failureReason,
      voterEmail: payment.voterEmail,
      voterName: payment.voterName,
      channel: payment.channel,
      cardLast4: payment.cardLast4,
      mobileNumber: payment.mobileNumber,
      customerIp: payment.customerIp,
      eventId: payment.eventId,
      categoryId: payment.categoryId,
      categoryName: "categoryName" in payment ? payment.categoryName : null,
      contestantId: payment.contestantId,
      contestantName:
        "contestantName" in payment ? payment.contestantName : null,
      contestantCode:
        "contestantCode" in payment ? payment.contestantCode : null,
      voteId: payment.voteId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}

export class WebhookEventResponseDto {
  id!: string;
  eventType!: string;
  signatureValid!: boolean;
  receivedAt!: Date;
  processed!: boolean;
  processedAt!: Date | null;

  static fromDomain(event: PaymentWebhookEvent): WebhookEventResponseDto {
    return {
      id: event.id,
      eventType: event.eventType,
      signatureValid: event.signatureValid,
      receivedAt: event.receivedAt,
      processed: event.processed,
      processedAt: event.processedAt,
    };
  }
}

export class PaymentSummaryResponseDto {
  totalCount!: number;
  successCount!: number;
  pendingCount!: number;
  failedCount!: number;
  abandonedCount!: number;
  refundedCount!: number;
  grossMinor!: number;
  feesMinor!: number;
  netMinor!: number;
  currency!: string | null;
  byStatus!: Array<{ status: string; count: number }>;
  byChannel!: Array<{ channel: string; count: number; totalAmountMinor: number }>;

  static fromDomain(summary: PaymentSummary): PaymentSummaryResponseDto {
    return {
      totalCount: summary.totalCount,
      successCount: summary.successCount,
      pendingCount: summary.pendingCount,
      failedCount: summary.failedCount,
      abandonedCount: summary.abandonedCount,
      refundedCount: summary.refundedCount,
      grossMinor: summary.grossMinor,
      feesMinor: summary.feesMinor,
      netMinor: summary.netMinor,
      currency: summary.currency,
      byStatus: summary.byStatus.map((b) => ({ status: b.status, count: b.count })),
      byChannel: summary.byChannel,
    };
  }
}

export class PaymentDetailResponseDto {
  payment!: PaymentResponseDto;
  webhookEvents!: WebhookEventResponseDto[];

  static fromDomain(detail: PaymentDetailWithContext): PaymentDetailResponseDto {
    return {
      payment: PaymentResponseDto.fromDomain(detail.payment),
      webhookEvents: detail.webhookEvents.map((e) =>
        WebhookEventResponseDto.fromDomain(e),
      ),
    };
  }
}

export class PaymentListResponseDto {
  rows!: PaymentResponseDto[];
  total!: number;
  page!: number;
  pageSize!: number;
  summary!: PaymentSummaryResponseDto;

  static fromResult(result: ListEventPaymentsResult): PaymentListResponseDto {
    return {
      rows: result.rows.map((p) => PaymentResponseDto.fromDomain(p)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      summary: PaymentSummaryResponseDto.fromDomain(result.summary),
    };
  }
}
