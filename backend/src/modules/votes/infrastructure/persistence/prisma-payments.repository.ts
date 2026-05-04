import { Injectable } from "@nestjs/common";
import {
  Payment as PrismaPayment,
  PaymentStatus as PrismaPaymentStatus,
  PaymentWebhookEvent as PrismaPaymentWebhookEvent,
  Prisma,
} from "@prisma/client";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import {
  CreatePendingPaymentInput,
  MarkPaymentFailedInput,
  MarkPaymentSucceededInput,
  PaymentsRepository,
  RecordWebhookEventInput,
} from "../../application/ports/payments.repository";
import { Payment, PaymentWebhookEvent } from "../../domain/payment";
import { PaymentStatus } from "../../domain/payment-status";

@Injectable()
export class PrismaPaymentsRepository implements PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPending(
    input: CreatePendingPaymentInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment> {
    const client = tx ?? this.prisma;
    const payment = await client.payment.create({
      data: {
        reference: input.reference,
        amountMinor: input.amountMinor,
        currency: input.currency,
        status: PrismaPaymentStatus.PENDING,
        voterEmail: input.voterEmail.trim().toLowerCase(),
        voterName: input.voterName ?? null,
        customerIp: input.customerIp ?? null,
        eventId: input.eventId,
        categoryId: input.categoryId,
        contestantId: input.contestantId,
        rawInitResponse: input.rawInitResponse ?? Prisma.JsonNull,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
    return this.toDomain(payment);
  }

  async findByReference(reference: string): Promise<Payment | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
    });
    return payment ? this.toDomain(payment) : null;
  }

  async linkVote(
    paymentId: string,
    voteId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment> {
    const client = tx ?? this.prisma;
    const payment = await client.payment.update({
      where: { id: paymentId },
      data: { voteId },
    });
    return this.toDomain(payment);
  }

  async markSucceeded(
    input: MarkPaymentSucceededInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment> {
    const client = tx ?? this.prisma;
    const payment = await client.payment.update({
      where: { reference: input.reference },
      data: {
        status: PrismaPaymentStatus.SUCCEEDED,
        providerRef: input.providerRef ?? undefined,
        amountPaidMinor: input.amountPaidMinor ?? undefined,
        feeMinor: input.feeMinor ?? undefined,
        paidAt: input.paidAt,
        channel: input.channel ?? undefined,
        cardLast4: input.cardLast4 ?? undefined,
        mobileNumber: input.mobileNumber ?? undefined,
        rawVerifyResponse:
          input.rawVerifyResponse !== undefined
            ? input.rawVerifyResponse ?? Prisma.JsonNull
            : undefined,
      },
    });
    return this.toDomain(payment);
  }

  async markFailed(
    input: MarkPaymentFailedInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment> {
    const client = tx ?? this.prisma;
    const payment = await client.payment.update({
      where: { reference: input.reference },
      data: {
        status: PrismaPaymentStatus.FAILED,
        providerRef: input.providerRef ?? undefined,
        failureReason: input.failureReason,
        failedAt: input.failedAt,
        rawVerifyResponse:
          input.rawVerifyResponse !== undefined
            ? input.rawVerifyResponse ?? Prisma.JsonNull
            : undefined,
      },
    });
    return this.toDomain(payment);
  }

  async recordWebhookEvent(
    input: RecordWebhookEventInput,
  ): Promise<PaymentWebhookEvent> {
    const event = await this.prisma.paymentWebhookEvent.create({
      data: {
        paymentId: input.paymentId ?? null,
        eventType: input.eventType,
        reference: input.reference,
        signatureValid: input.signatureValid,
        rawPayload: input.rawPayload,
      },
    });
    return this.toWebhookDomain(event);
  }

  async markWebhookProcessed(eventId: string): Promise<void> {
    await this.prisma.paymentWebhookEvent.update({
      where: { id: eventId },
      data: { processed: true, processedAt: new Date() },
    });
  }

  async getStatus(reference: string): Promise<PaymentStatus | null> {
    const row = await this.prisma.payment.findUnique({
      where: { reference },
      select: { status: true },
    });
    return row ? (row.status as PaymentStatus) : null;
  }

  private toDomain(payment: PrismaPayment): Payment {
    return {
      id: payment.id,
      reference: payment.reference,
      providerRef: payment.providerRef,
      provider: payment.provider,
      amountMinor: payment.amountMinor,
      amountPaidMinor: payment.amountPaidMinor,
      feeMinor: payment.feeMinor,
      currency: payment.currency,
      status: payment.status as PaymentStatus,
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
      contestantId: payment.contestantId,
      voteId: payment.voteId,
      rawInitResponse: payment.rawInitResponse,
      rawVerifyResponse: payment.rawVerifyResponse,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private toWebhookDomain(
    event: PrismaPaymentWebhookEvent,
  ): PaymentWebhookEvent {
    return {
      id: event.id,
      paymentId: event.paymentId,
      provider: event.provider,
      eventType: event.eventType,
      reference: event.reference,
      signatureValid: event.signatureValid,
      rawPayload: event.rawPayload,
      receivedAt: event.receivedAt,
      processed: event.processed,
      processedAt: event.processedAt,
    };
  }
}
