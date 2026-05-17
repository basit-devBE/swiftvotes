import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

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
    private readonly paystack: PaystackService,
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
      return this.ticketingRepository.markPaymentSucceededAndIssueTickets({
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
}
