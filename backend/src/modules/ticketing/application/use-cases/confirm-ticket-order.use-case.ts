import {
  ConflictException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { NOTIFICATIONS_SERVICE } from "../../../notifications/application/notifications.tokens";
import { NotificationsService } from "../../../notifications/application/ports/notifications.service";
import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { JunipayService } from "../../../junipay/infrastructure/junipay.service";
import { PaystackService } from "../../../votes/infrastructure/payments/paystack.service";
import { TicketOrder } from "../../domain/ticket-order";
import { TicketOrderStatus } from "../../domain/ticket-order-status";
import { TicketPaymentStatus } from "../../domain/ticket-payment-status";
import { TICKETING_REPOSITORY } from "../ticketing.tokens";
import { TicketingRepository } from "../ports/ticketing.repository";

@Injectable()
export class ConfirmTicketOrderUseCase {
  constructor(
    @Inject(TICKETING_REPOSITORY)
    private readonly ticketingRepository: TicketingRepository,
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(NOTIFICATIONS_SERVICE)
    private readonly notifications: NotificationsService,
    private readonly paystack: PaystackService,
    private readonly junipay: JunipayService,
  ) {}

  async execute(reference: string): Promise<TicketOrder> {
    const existing = await this.ticketingRepository.findOrderByPaymentReference(
      reference,
    );
    if (!existing || !existing.payment) {
      throw new NotFoundException("Ticket payment reference was not found.");
    }

    if (
      existing.status === TicketOrderStatus.PAID &&
      existing.payment.status === TicketPaymentStatus.SUCCEEDED
    ) {
      return existing;
    }

    if (existing.payment.provider === "junipay") {
      return this.confirmJunipayPayment(existing, reference);
    }

    const verified = await this.paystack.verifyTransaction(reference);
    if (verified.reference !== existing.payment.reference) {
      throw new BadRequestException("Payment reference mismatch.");
    }
    if (verified.amount !== existing.payment.amountMinor) {
      throw new BadRequestException("Payment amount mismatch.");
    }
    if (verified.currency !== existing.payment.currency) {
      throw new BadRequestException("Payment currency mismatch.");
    }

    const rawVerifyResponse = verified.raw as Prisma.InputJsonValue;

    if (verified.status === "success") {
      const result = await this.ticketingRepository.markPaymentSucceededAndIssueTickets({
        reference,
        providerRef: verified.providerRef,
        amountPaidMinor: verified.amount,
        feeMinor: verified.fees,
        paidAt: verified.paidAt ? new Date(verified.paidAt) : new Date(),
        channel: verified.channel,
        cardLast4: verified.cardLast4,
        mobileNumber: verified.mobileNumber,
        rawVerifyResponse,
      });
      if (result.issuedNow) {
        await this.sendConfirmationEmail(result.order);
      }
      return result.order;
    }

    return this.ticketingRepository.markPaymentFailed({
      reference,
      providerRef: verified.providerRef,
      failureReason: verified.gatewayResponse ?? verified.status,
      failedAt: new Date(),
      rawVerifyResponse,
    });
  }

  async markFailed(reference: string, reason = "Payment failed."): Promise<TicketOrder> {
    return this.ticketingRepository.markPaymentFailed({
      reference,
      failureReason: reason,
      failedAt: new Date(),
    });
  }

  private async confirmJunipayPayment(
    existing: TicketOrder,
    reference: string,
  ): Promise<TicketOrder> {
    if (!existing.payment) {
      throw new NotFoundException("Ticket payment reference was not found.");
    }

    const verified = await this.junipay.checkTransactionStatus(
      existing.payment.providerRef ?? reference,
    );
    const rawVerifyResponse = verified.raw as Prisma.InputJsonValue;

    if (
      verified.status === "success" &&
      verified.amountMinor !== null &&
      verified.amountMinor !== existing.payment.amountMinor
    ) {
      throw new BadRequestException("Payment amount mismatch.");
    }

    if (verified.status === "success") {
      const result = await this.ticketingRepository.markPaymentSucceededAndIssueTickets({
        reference,
        providerRef: verified.providerRef,
        amountPaidMinor: verified.amountMinor ?? existing.payment.amountMinor,
        feeMinor: verified.feesMinor,
        paidAt: verified.paidAt ? new Date(verified.paidAt) : new Date(),
        channel: "mobile_money",
        mobileNumber: verified.mobileNumber,
        rawVerifyResponse,
      });
      if (result.issuedNow) {
        await this.sendConfirmationEmail(result.order);
      }
      return result.order;
    }

    if (verified.status === "failed" || verified.status === "abandoned") {
      return this.ticketingRepository.markPaymentFailed({
        reference,
        providerRef: verified.providerRef,
        failureReason: verified.message ?? verified.status,
        failedAt: new Date(),
        rawVerifyResponse,
      });
    }

    return existing;
  }

  private async sendConfirmationEmail(order: TicketOrder): Promise<void> {
    const event = await this.eventsRepository.findById(order.eventId);
    if (!event || !order.payment || order.issuedTickets.length === 0) {
      return;
    }

    const itemNameById = new Map(
      order.items.map((item) => [
        item.id,
        item.ticketTypeName ?? "Event Access",
      ]),
    );

    await this.notifications.sendTicketConfirmationEmail({
      recipientEmail: order.buyerEmail,
      recipientName: order.buyerName,
      eventId: event.id,
      eventName: event.name,
      primaryFlyerUrl: event.primaryFlyerUrl,
      eventStartAt: event.eventStartAt,
      eventEndAt: event.eventEndAt,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      quantity: order.issuedTickets.length,
      amountMinor: order.payment.amountPaidMinor ?? order.payment.amountMinor,
      currency: order.currency,
      orderReference: order.payment.reference,
      issuedAt: order.payment.paidAt ?? new Date(),
      tickets: order.issuedTickets.map((ticket) => ({
        code: ticket.code,
        ticketTypeName: itemNameById.get(ticket.orderItemId) ?? "Event Access",
        qrImageUrl: "",
        redeemUrl: "",
      })),
    });
  }
}
