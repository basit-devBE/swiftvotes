import { randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";
import {
  IssuedTicket as PrismaIssuedTicket,
  Prisma,
  TicketOrder as PrismaTicketOrder,
  TicketOrderItem as PrismaTicketOrderItem,
  TicketOrderStatus as PrismaTicketOrderStatus,
  TicketPayment as PrismaTicketPayment,
  TicketPaymentStatus as PrismaTicketPaymentStatus,
  TicketPaymentWebhookEvent as PrismaTicketPaymentWebhookEvent,
  TicketType as PrismaTicketType,
} from "@prisma/client";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import {
  CreatePendingTicketOrderInput,
  CreateTicketTypeInput,
  MarkTicketPaymentFailedInput,
  MarkTicketPaymentSucceededInput,
  RedeemedIssuedTicket,
  RecordTicketWebhookEventInput,
  TicketingRepository,
  TicketPaymentWebhookEvent,
  UpdateTicketPaymentInitializationInput,
  UpdateTicketTypeInput,
} from "../../application/ports/ticketing.repository";
import {
  IssuedTicket,
  TicketOrder,
  TicketOrderItem,
  TicketPayment,
} from "../../domain/ticket-order";
import { TicketOrderStatus } from "../../domain/ticket-order-status";
import { TicketPaymentStatus } from "../../domain/ticket-payment-status";
import { TicketType } from "../../domain/ticket-type";

const ORDER_INCLUDE = {
  items: {
    include: {
      ticketType: {
        select: { name: true },
      },
    },
  },
  payment: true,
  issuedTickets: true,
};

type PrismaOrderWithRelations = PrismaTicketOrder & {
  items: Array<
    PrismaTicketOrderItem & {
      ticketType: { name: string } | null;
    }
  >;
  payment: PrismaTicketPayment | null;
  issuedTickets: PrismaIssuedTicket[];
};

@Injectable()
export class PrismaTicketingRepository implements TicketingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTicketType(input: CreateTicketTypeInput): Promise<TicketType> {
    const ticketType = await this.prisma.ticketType.create({
      data: {
        eventId: input.eventId,
        name: input.name,
        description: input.description ?? null,
        priceMinor: input.priceMinor,
        currency: input.currency.trim().toUpperCase(),
        quantityAvailable: input.quantityAvailable ?? null,
        salesStartAt: input.salesStartAt ?? null,
        salesEndAt: input.salesEndAt ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    return this.toTicketTypeDomain(ticketType);
  }

  async updateTicketType(
    ticketTypeId: string,
    input: UpdateTicketTypeInput,
  ): Promise<TicketType> {
    const ticketType = await this.prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: {
        name: input.name,
        description: input.description,
        priceMinor: input.priceMinor,
        currency: input.currency?.trim().toUpperCase(),
        quantityAvailable: input.quantityAvailable,
        salesStartAt: input.salesStartAt,
        salesEndAt: input.salesEndAt,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
    });
    return this.toTicketTypeDomain(ticketType);
  }

  async findTicketTypeById(ticketTypeId: string): Promise<TicketType | null> {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
    });
    return ticketType ? this.toTicketTypeDomain(ticketType) : null;
  }

  async listTicketTypes(
    eventId: string,
    includeInactive = false,
  ): Promise<TicketType[]> {
    const ticketTypes = await this.prisma.ticketType.findMany({
      where: {
        eventId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return ticketTypes.map((ticketType) => this.toTicketTypeDomain(ticketType));
  }

  async disableTicketType(ticketTypeId: string): Promise<void> {
    await this.prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: { isActive: false },
    });
  }

  async createPendingOrder(
    input: CreatePendingTicketOrderInput,
  ): Promise<TicketOrder> {
    const order = await this.prisma.ticketOrder.create({
      data: {
        eventId: input.eventId,
        buyerName: input.buyerName,
        buyerEmail: input.buyerEmail.trim().toLowerCase(),
        buyerPhone: input.buyerPhone ?? null,
        status: PrismaTicketOrderStatus.PENDING,
        totalAmountMinor: input.totalAmountMinor,
        currency: input.currency,
        items: {
          create: input.items.map((item) => ({
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            unitPriceMinor: item.unitPriceMinor,
            totalAmountMinor: item.totalAmountMinor,
          })),
        },
        payment: {
          create: {
            reference: input.payment.reference,
            amountMinor: input.payment.amountMinor,
            currency: input.currency,
            status: PrismaTicketPaymentStatus.PENDING,
            buyerEmail: input.buyerEmail.trim().toLowerCase(),
            buyerName: input.buyerName,
            buyerPhone: input.buyerPhone ?? null,
            provider: input.payment.provider ?? undefined,
            providerRef: input.payment.providerRef ?? undefined,
            channel: input.payment.channel ?? undefined,
            mobileNumber: input.payment.mobileNumber ?? undefined,
            customerIp: input.payment.customerIp ?? null,
            rawInitResponse: input.payment.rawInitResponse ?? Prisma.JsonNull,
            metadata: input.payment.metadata ?? Prisma.JsonNull,
          },
        },
      },
      include: ORDER_INCLUDE,
    });
    return this.toOrderDomain(order);
  }

  async findOrderById(orderId: string): Promise<TicketOrder | null> {
    const order = await this.prisma.ticketOrder.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    return order ? this.toOrderDomain(order) : null;
  }

  async findPaymentByReference(reference: string): Promise<TicketPayment | null> {
    const payment = await this.prisma.ticketPayment.findUnique({
      where: { reference },
    });
    return payment ? this.toPaymentDomain(payment) : null;
  }

  async findOrderByPaymentReference(reference: string): Promise<TicketOrder | null> {
    const payment = await this.prisma.ticketPayment.findUnique({
      where: { reference },
      select: { orderId: true },
    });
    if (!payment) return null;
    return this.findOrderById(payment.orderId);
  }

  async updatePaymentInitialization(
    input: UpdateTicketPaymentInitializationInput,
  ): Promise<TicketPayment> {
    const payment = await this.prisma.ticketPayment.update({
      where: { reference: input.reference },
      data: {
        providerRef: input.providerRef ?? undefined,
        rawInitResponse:
          input.rawInitResponse !== undefined
            ? input.rawInitResponse ?? Prisma.JsonNull
            : undefined,
      },
    });
    return this.toPaymentDomain(payment);
  }

  async markPaymentSucceededAndIssueTickets(
    input: MarkTicketPaymentSucceededInput,
  ): Promise<TicketOrder> {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.ticketOrder.findFirst({
          where: { payment: { reference: input.reference } },
          include: ORDER_INCLUDE,
        });

        if (!order) {
          throw new Error("Ticket order was not found for payment reference.");
        }

        if (
          order.status === PrismaTicketOrderStatus.PAID &&
          order.payment?.status === PrismaTicketPaymentStatus.SUCCEEDED
        ) {
          return this.toOrderDomain(order);
        }

        for (const item of order.items) {
          const ticketType = await tx.ticketType.findUnique({
            where: { id: item.ticketTypeId },
          });

          if (!ticketType) {
            throw new Error("Ticket type was not found while issuing tickets.");
          }

          if (
            ticketType.quantityAvailable !== null &&
            ticketType.quantitySold + item.quantity > ticketType.quantityAvailable
          ) {
            throw new Error("Ticket inventory is no longer available.");
          }

          await tx.ticketType.update({
            where: { id: ticketType.id },
            data: { quantitySold: { increment: item.quantity } },
          });

          await tx.issuedTicket.createMany({
            data: Array.from({ length: item.quantity }, () => ({
              eventId: order.eventId,
              orderId: order.id,
              orderItemId: item.id,
              ticketTypeId: item.ticketTypeId,
              code: this.generateTicketCode(),
            })),
          });
        }

        await tx.ticketPayment.update({
          where: { reference: input.reference },
          data: {
            status: PrismaTicketPaymentStatus.SUCCEEDED,
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

        const updated = await tx.ticketOrder.update({
          where: { id: order.id },
          data: { status: PrismaTicketOrderStatus.PAID },
          include: ORDER_INCLUDE,
        });

        return this.toOrderDomain(updated);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async markPaymentFailed(
    input: MarkTicketPaymentFailedInput,
  ): Promise<TicketOrder> {
    const payment = await this.prisma.ticketPayment.update({
      where: { reference: input.reference },
      data: {
        status: PrismaTicketPaymentStatus.FAILED,
        providerRef: input.providerRef ?? undefined,
        failureReason: input.failureReason,
        failedAt: input.failedAt,
        rawVerifyResponse:
          input.rawVerifyResponse !== undefined
            ? input.rawVerifyResponse ?? Prisma.JsonNull
            : undefined,
        order: {
          update: { status: PrismaTicketOrderStatus.FAILED },
        },
      },
      select: { orderId: true },
    });

    const order = await this.findOrderById(payment.orderId);
    if (!order) {
      throw new Error("Ticket order was not found after failed payment update.");
    }
    return order;
  }

  async getPaymentStatus(reference: string): Promise<TicketPaymentStatus | null> {
    const payment = await this.prisma.ticketPayment.findUnique({
      where: { reference },
      select: { status: true },
    });
    return payment ? (payment.status as TicketPaymentStatus) : null;
  }

  async recordWebhookEvent(
    input: RecordTicketWebhookEventInput,
  ): Promise<TicketPaymentWebhookEvent> {
    const event = await this.prisma.ticketPaymentWebhookEvent.create({
      data: {
        ticketPaymentId: input.ticketPaymentId ?? null,
        eventType: input.eventType,
        reference: input.reference,
        signatureValid: input.signatureValid,
        rawPayload: input.rawPayload,
      },
    });
    return this.toWebhookDomain(event);
  }

  async markWebhookProcessed(eventId: string): Promise<void> {
    await this.prisma.ticketPaymentWebhookEvent.update({
      where: { id: eventId },
      data: { processed: true, processedAt: new Date() },
    });
  }

  async redeemIssuedTicket(input: {
    eventId: string;
    code: string;
    checkedInById: string;
  }): Promise<RedeemedIssuedTicket> {
    const ticket = await this.prisma.issuedTicket.findFirst({
      where: {
        eventId: input.eventId,
        code: input.code,
      },
      include: {
        event: {
          select: { name: true },
        },
        order: {
          select: {
            id: true,
            buyerName: true,
            buyerEmail: true,
            payment: {
              select: { reference: true },
            },
          },
        },
        ticketType: {
          select: { name: true },
        },
      },
    });

    if (!ticket) {
      throw new Error("Issued ticket was not found.");
    }

    if (ticket.status === "CHECKED_IN") {
      throw new Error("Issued ticket has already been redeemed.");
    }

    if (ticket.status === "CANCELLED") {
      throw new Error("Issued ticket is cancelled.");
    }

    const updated = await this.prisma.issuedTicket.update({
      where: { id: ticket.id },
      data: {
        status: "CHECKED_IN",
        checkedInAt: new Date(),
        checkedInById: input.checkedInById,
      },
      include: {
        event: {
          select: { name: true },
        },
        order: {
          select: {
            id: true,
            buyerName: true,
            buyerEmail: true,
            payment: {
              select: { reference: true },
            },
          },
        },
        ticketType: {
          select: { name: true },
        },
      },
    });

    return {
      id: updated.id,
      eventId: updated.eventId,
      eventName: updated.event.name,
      orderId: updated.order.id,
      orderReference: updated.order.payment?.reference ?? null,
      buyerName: updated.order.buyerName,
      buyerEmail: updated.order.buyerEmail,
      ticketTypeName: updated.ticketType.name,
      code: updated.code,
      status: updated.status,
      checkedInAt: updated.checkedInAt,
      checkedInById: updated.checkedInById,
      createdAt: updated.createdAt,
    };
  }

  private generateTicketCode(): string {
    return `SWT-${randomBytes(5).toString("hex").toUpperCase()}`;
  }

  private toTicketTypeDomain(ticketType: PrismaTicketType): TicketType {
    return {
      id: ticketType.id,
      eventId: ticketType.eventId,
      name: ticketType.name,
      description: ticketType.description,
      priceMinor: ticketType.priceMinor,
      currency: ticketType.currency,
      quantityAvailable: ticketType.quantityAvailable,
      quantitySold: ticketType.quantitySold,
      salesStartAt: ticketType.salesStartAt,
      salesEndAt: ticketType.salesEndAt,
      isActive: ticketType.isActive,
      sortOrder: ticketType.sortOrder,
      createdAt: ticketType.createdAt,
      updatedAt: ticketType.updatedAt,
    };
  }

  private toOrderDomain(order: PrismaOrderWithRelations): TicketOrder {
    return {
      id: order.id,
      eventId: order.eventId,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      buyerPhone: order.buyerPhone,
      status: order.status as TicketOrderStatus,
      totalAmountMinor: order.totalAmountMinor,
      currency: order.currency,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => this.toOrderItemDomain(item)),
      payment: order.payment ? this.toPaymentDomain(order.payment) : null,
      issuedTickets: order.issuedTickets.map((ticket) =>
        this.toIssuedTicketDomain(ticket),
      ),
    };
  }

  private toOrderItemDomain(
    item: PrismaTicketOrderItem & { ticketType?: { name: string } | null },
  ): TicketOrderItem {
    return {
      id: item.id,
      orderId: item.orderId,
      ticketTypeId: item.ticketTypeId,
      ticketTypeName: item.ticketType?.name ?? null,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      totalAmountMinor: item.totalAmountMinor,
      createdAt: item.createdAt,
    };
  }

  private toPaymentDomain(payment: PrismaTicketPayment): TicketPayment {
    return {
      id: payment.id,
      orderId: payment.orderId,
      reference: payment.reference,
      providerRef: payment.providerRef,
      provider: payment.provider,
      amountMinor: payment.amountMinor,
      amountPaidMinor: payment.amountPaidMinor,
      feeMinor: payment.feeMinor,
      currency: payment.currency,
      status: payment.status as TicketPaymentStatus,
      initializedAt: payment.initializedAt,
      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      failureReason: payment.failureReason,
      buyerEmail: payment.buyerEmail,
      buyerName: payment.buyerName,
      buyerPhone: payment.buyerPhone,
      channel: payment.channel,
      cardLast4: payment.cardLast4,
      mobileNumber: payment.mobileNumber,
      customerIp: payment.customerIp,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private toIssuedTicketDomain(ticket: PrismaIssuedTicket): IssuedTicket {
    return {
      id: ticket.id,
      eventId: ticket.eventId,
      orderId: ticket.orderId,
      orderItemId: ticket.orderItemId,
      ticketTypeId: ticket.ticketTypeId,
      code: ticket.code,
      status: ticket.status,
      checkedInAt: ticket.checkedInAt,
      checkedInById: ticket.checkedInById,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  private toWebhookDomain(
    event: PrismaTicketPaymentWebhookEvent,
  ): TicketPaymentWebhookEvent {
    return {
      id: event.id,
      ticketPaymentId: event.ticketPaymentId,
      provider: event.provider,
      eventType: event.eventType,
      reference: event.reference,
      signatureValid: event.signatureValid,
      receivedAt: event.receivedAt,
      processed: event.processed,
      processedAt: event.processedAt,
    };
  }
}
