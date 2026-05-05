import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { CONTESTANTS_REPOSITORY } from "../../../contestants/application/contestants.tokens";
import { ContestantsRepository } from "../../../contestants/application/ports/contestants.repository";
import { PaymentStatus } from "../../domain/payment-status";
import { PAYMENTS_REPOSITORY } from "../votes.tokens";
import {
  ListPaymentsFilters,
  PaymentSummary,
  PaymentWithContext,
  PaymentsRepository,
} from "../ports/payments.repository";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 200;

export type ListEventPaymentsInput = {
  eventId: string;
  status?: PaymentStatus;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

export type ListEventPaymentsResult = {
  rows: PaymentWithContext[];
  total: number;
  page: number;
  pageSize: number;
  summary: PaymentSummary;
};

@Injectable()
export class ListEventPaymentsUseCase {
  constructor(
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
  ) {}

  async execute(input: ListEventPaymentsInput): Promise<ListEventPaymentsResult> {
    const event = await this.eventsRepository.findById(input.eventId);
    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    const filters: ListPaymentsFilters = {
      status: input.status,
      from: input.from,
      to: input.to,
    };

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE),
    );

    const [list, summary, contestants] = await Promise.all([
      this.paymentsRepository.list({
        eventId: input.eventId,
        filters,
        page,
        pageSize,
      }),
      this.paymentsRepository.summarize(input.eventId, filters),
      this.contestantsRepository.findByEvent(input.eventId),
    ]);
    const categoriesById = new Map(event.categories.map((c) => [c.id, c]));
    const contestantsById = new Map(contestants.map((c) => [c.id, c]));

    return {
      rows: list.rows.map((payment) => {
        const contestant = contestantsById.get(payment.contestantId);
        const category = categoriesById.get(payment.categoryId);
        return {
          ...payment,
          contestantName: contestant?.name ?? null,
          contestantCode: contestant?.code ?? null,
          categoryName: category?.name ?? null,
        };
      }),
      total: list.total,
      page: list.page,
      pageSize: list.pageSize,
      summary,
    };
  }
}
