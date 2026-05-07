import { Injectable } from "@nestjs/common";
import {
  Payment as PrismaPayment,
  PaymentStatus as PrismaPaymentStatus,
  PaymentWebhookEvent as PrismaPaymentWebhookEvent,
  Prisma,
} from "@prisma/client";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import {
  ChannelBreakdownEntry,
  CreatePendingPaymentInput,
  ListAllPaymentsFilters,
  ListAllPaymentsInput,
  ListAllPaymentsResult,
  ListPaymentsFilters,
  ListPaymentsInput,
  ListPaymentsResult,
  MarkPaymentFailedInput,
  MarkPaymentSucceededInput,
  PaymentDetail,
  PaymentSummary,
  PaymentsRepository,
  PaymentWithFullContext,
  RecordWebhookEventInput,
  StatusBreakdownEntry,
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

  async list(input: ListPaymentsInput): Promise<ListPaymentsResult> {
    const where = this.buildWhere(input.eventId, input.filters);
    const skip = (input.page - 1) * input.pageSize;

    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: input.pageSize,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      rows: rows.map((p) => this.toDomain(p)),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async listAll(input: ListAllPaymentsInput): Promise<ListAllPaymentsResult> {
    const where = this.buildAllWhere(input.filters);
    const skip = (input.page - 1) * input.pageSize;

    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: input.pageSize,
        include: { event: { select: { name: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const categoryIds = Array.from(new Set(rows.map((r) => r.categoryId)));
    const contestantIds = Array.from(new Set(rows.map((r) => r.contestantId)));

    const [categories, contestants] = await Promise.all([
      categoryIds.length > 0
        ? this.prisma.eventCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      contestantIds.length > 0
        ? this.prisma.contestant.findMany({
            where: { id: { in: contestantIds } },
            select: { id: true, name: true, code: true },
          })
        : Promise.resolve([]),
    ]);

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const contestantById = new Map(contestants.map((c) => [c.id, c]));

    const mapped: PaymentWithFullContext[] = rows.map((p) => ({
      ...this.toDomain(p),
      eventName: p.event?.name ?? null,
      categoryName: categoryById.get(p.categoryId)?.name ?? null,
      contestantName: contestantById.get(p.contestantId)?.name ?? null,
      contestantCode: contestantById.get(p.contestantId)?.code ?? null,
    }));

    return {
      rows: mapped,
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async summarizeAll(filters: ListAllPaymentsFilters = {}): Promise<PaymentSummary> {
    const where = this.buildAllWhere(filters);

    const [byStatusRows, byChannelRows, currencyRow] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
        _sum: { amountPaidMinor: true, feeMinor: true },
      }),
      this.prisma.payment.groupBy({
        by: ["channel"],
        where: { ...where, status: PrismaPaymentStatus.SUCCEEDED },
        _count: { _all: true },
        _sum: { amountPaidMinor: true },
      }),
      this.prisma.payment.groupBy({
        by: ["currency"],
        where: { ...where, status: PrismaPaymentStatus.SUCCEEDED },
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 1,
      }),
    ]);

    const buckets: Record<PrismaPaymentStatus, number> = {
      PENDING: 0,
      SUCCEEDED: 0,
      FAILED: 0,
      ABANDONED: 0,
      REFUNDED: 0,
    };
    let totalCount = 0;
    let grossMinor = 0;
    let feesMinor = 0;

    for (const r of byStatusRows) {
      buckets[r.status] = r._count._all;
      totalCount += r._count._all;
      if (r.status === PrismaPaymentStatus.SUCCEEDED) {
        grossMinor += r._sum.amountPaidMinor ?? 0;
        feesMinor += r._sum.feeMinor ?? 0;
      }
    }

    const byStatus: StatusBreakdownEntry[] = (
      Object.keys(buckets) as PrismaPaymentStatus[]
    ).map((s) => ({ status: s as PaymentStatus, count: buckets[s] }));

    const byChannel: ChannelBreakdownEntry[] = byChannelRows.map((r) => ({
      channel: r.channel ?? "unknown",
      count: r._count._all,
      totalAmountMinor: r._sum.amountPaidMinor ?? 0,
    }));

    return {
      totalCount,
      successCount: buckets.SUCCEEDED,
      pendingCount: buckets.PENDING,
      failedCount: buckets.FAILED,
      abandonedCount: buckets.ABANDONED,
      refundedCount: buckets.REFUNDED,
      grossMinor,
      feesMinor,
      netMinor: grossMinor - feesMinor,
      currency: currencyRow[0]?.currency ?? null,
      byStatus,
      byChannel,
    };
  }

  async findDetailById(paymentId: string): Promise<PaymentDetail | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        webhookEvents: {
          orderBy: { receivedAt: "asc" },
        },
      },
    });
    if (!payment) return null;
    return {
      payment: this.toDomain(payment),
      webhookEvents: payment.webhookEvents.map((e) => this.toWebhookDomain(e)),
    };
  }

  async summarize(
    eventId: string,
    filters: ListPaymentsFilters = {},
  ): Promise<PaymentSummary> {
    const where = this.buildWhere(eventId, filters);

    const [byStatusRows, byChannelRows, currencyRow] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
        _sum: { amountPaidMinor: true, feeMinor: true },
      }),
      this.prisma.payment.groupBy({
        by: ["channel"],
        where: { ...where, status: PrismaPaymentStatus.SUCCEEDED },
        _count: { _all: true },
        _sum: { amountPaidMinor: true },
      }),
      this.prisma.payment.findFirst({
        where: { eventId },
        select: { currency: true },
      }),
    ]);

    const buckets: Record<PrismaPaymentStatus, number> = {
      PENDING: 0,
      SUCCEEDED: 0,
      FAILED: 0,
      ABANDONED: 0,
      REFUNDED: 0,
    };
    let totalCount = 0;
    let grossMinor = 0;
    let feesMinor = 0;

    for (const r of byStatusRows) {
      buckets[r.status] = r._count._all;
      totalCount += r._count._all;
      if (r.status === PrismaPaymentStatus.SUCCEEDED) {
        grossMinor += r._sum.amountPaidMinor ?? 0;
        feesMinor += r._sum.feeMinor ?? 0;
      }
    }

    const byStatus: StatusBreakdownEntry[] = (
      Object.keys(buckets) as PrismaPaymentStatus[]
    ).map((s) => ({ status: s as PaymentStatus, count: buckets[s] }));

    const byChannel: ChannelBreakdownEntry[] = byChannelRows.map((r) => ({
      channel: r.channel ?? "unknown",
      count: r._count._all,
      totalAmountMinor: r._sum.amountPaidMinor ?? 0,
    }));

    return {
      totalCount,
      successCount: buckets.SUCCEEDED,
      pendingCount: buckets.PENDING,
      failedCount: buckets.FAILED,
      abandonedCount: buckets.ABANDONED,
      refundedCount: buckets.REFUNDED,
      grossMinor,
      feesMinor,
      netMinor: grossMinor - feesMinor,
      currency: currencyRow?.currency ?? null,
      byStatus,
      byChannel,
    };
  }

  private buildWhere(
    eventId: string,
    filters: ListPaymentsFilters,
  ): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = { eventId };
    if (filters.status) {
      where.status = filters.status as PrismaPaymentStatus;
    }
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }
    return where;
  }

  private buildAllWhere(filters: ListAllPaymentsFilters): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = {};
    if (filters.status) where.status = filters.status as PrismaPaymentStatus;
    if (filters.eventId) where.eventId = filters.eventId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }
    if (filters.search) {
      const term = filters.search.trim();
      if (term.length > 0) {
        where.OR = [
          { voterEmail: { contains: term, mode: "insensitive" } },
          { reference: { contains: term, mode: "insensitive" } },
          { providerRef: { contains: term, mode: "insensitive" } },
        ];
      }
    }
    return where;
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
