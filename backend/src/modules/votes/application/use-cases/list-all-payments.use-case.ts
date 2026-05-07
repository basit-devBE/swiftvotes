import { Inject, Injectable } from "@nestjs/common";

import { PaymentStatus } from "../../domain/payment-status";
import { PAYMENTS_REPOSITORY } from "../votes.tokens";
import {
  ListAllPaymentsFilters,
  PaymentSummary,
  PaymentWithFullContext,
  PaymentsRepository,
} from "../ports/payments.repository";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 200;

export type ListAllPaymentsUseCaseInput = {
  status?: PaymentStatus;
  eventId?: string;
  from?: Date;
  to?: Date;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ListAllPaymentsUseCaseResult = {
  rows: PaymentWithFullContext[];
  total: number;
  page: number;
  pageSize: number;
  summary: PaymentSummary;
};

@Injectable()
export class ListAllPaymentsUseCase {
  constructor(
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  async execute(
    input: ListAllPaymentsUseCaseInput,
  ): Promise<ListAllPaymentsUseCaseResult> {
    const filters: ListAllPaymentsFilters = {
      status: input.status,
      eventId: input.eventId,
      from: input.from,
      to: input.to,
      search: input.search,
    };

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE),
    );

    const [list, summary] = await Promise.all([
      this.paymentsRepository.listAll({ filters, page, pageSize }),
      this.paymentsRepository.summarizeAll(filters),
    ]);

    return {
      rows: list.rows,
      total: list.total,
      page: list.page,
      pageSize: list.pageSize,
      summary,
    };
  }
}
