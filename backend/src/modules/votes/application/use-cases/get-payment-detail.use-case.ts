import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { CONTESTANTS_REPOSITORY } from "../../../contestants/application/contestants.tokens";
import { ContestantsRepository } from "../../../contestants/application/ports/contestants.repository";
import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { PAYMENTS_REPOSITORY } from "../votes.tokens";
import {
  PaymentDetail,
  PaymentsRepository,
  PaymentWithContext,
} from "../ports/payments.repository";

export type PaymentDetailWithContext = Omit<PaymentDetail, "payment"> & {
  payment: PaymentWithContext;
};

@Injectable()
export class GetPaymentDetailUseCase {
  constructor(
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
  ) {}

  async execute(input: {
    paymentId: string;
    eventId: string;
  }): Promise<PaymentDetailWithContext> {
    const detail = await this.paymentsRepository.findDetailById(input.paymentId);
    if (!detail) {
      throw new NotFoundException("Payment not found.");
    }
    if (detail.payment.eventId !== input.eventId) {
      throw new ForbiddenException("Payment does not belong to this event.");
    }
    const event = await this.eventsRepository.findById(input.eventId);
    if (!event) {
      throw new NotFoundException("Event not found.");
    }
    const contestant = await this.contestantsRepository.findById(
      detail.payment.contestantId,
    );
    const category = event.categories.find(
      (c) => c.id === detail.payment.categoryId,
    );

    return {
      ...detail,
      payment: {
        ...detail.payment,
        contestantName: contestant?.name ?? null,
        contestantCode: contestant?.code ?? null,
        categoryName: category?.name ?? null,
      },
    };
  }
}
