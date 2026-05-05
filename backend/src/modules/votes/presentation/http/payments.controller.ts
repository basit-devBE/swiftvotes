import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
} from "@nestjs/common";
import { Response } from "express";

import { EventRole } from "../../../access-control/domain/event-role";
import { EventRoles } from "../../../access-control/presentation/http/decorators/event-roles.decorator";
import { PaymentStatus } from "../../domain/payment-status";
import { GetEventVotesSummaryUseCase } from "../../application/use-cases/get-event-votes-summary.use-case";
import { GetPaymentDetailUseCase } from "../../application/use-cases/get-payment-detail.use-case";
import { ListEventPaymentsUseCase } from "../../application/use-cases/list-event-payments.use-case";
import { EventVotesSummaryResponseDto } from "./responses/event-votes-summary.response.dto";
import {
  PaymentDetailResponseDto,
  PaymentListResponseDto,
} from "./responses/payment.response.dto";

@Controller({ version: "1" })
export class PaymentsController {
  constructor(
    private readonly listEventPaymentsUseCase: ListEventPaymentsUseCase,
    private readonly getPaymentDetailUseCase: GetPaymentDetailUseCase,
    private readonly getEventVotesSummaryUseCase: GetEventVotesSummaryUseCase,
  ) {}

  @Get("events/:eventId/votes/summary")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN, EventRole.ANALYST)
  async getVotesSummary(
    @Param("eventId") eventId: string,
  ): Promise<EventVotesSummaryResponseDto> {
    const summary = await this.getEventVotesSummaryUseCase.execute(eventId);
    return EventVotesSummaryResponseDto.fromDomain(summary);
  }

  @Get("events/:eventId/payments")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN, EventRole.ANALYST)
  async listPayments(
    @Param("eventId") eventId: string,
    @Query("status") status: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
  ): Promise<PaymentListResponseDto> {
    const result = await this.listEventPaymentsUseCase.execute({
      eventId,
      status: this.parseStatus(status),
      from: this.parseDate(from, "from"),
      to: this.parseDate(to, "to"),
      page: this.parsePositiveInt(page, "page"),
      pageSize: this.parsePositiveInt(pageSize, "pageSize"),
    });
    return PaymentListResponseDto.fromResult(result);
  }

  @Get("events/:eventId/payments.csv")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN, EventRole.ANALYST)
  async exportPaymentsCsv(
    @Param("eventId") eventId: string,
    @Query("status") status: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.listEventPaymentsUseCase.execute({
      eventId,
      status: this.parseStatus(status),
      from: this.parseDate(from, "from"),
      to: this.parseDate(to, "to"),
      page: 1,
      pageSize: 200,
    });

    const headers = [
      "reference",
      "providerRef",
      "status",
      "currency",
      "amountMinor",
      "amountPaidMinor",
      "feeMinor",
      "voterName",
      "voterEmail",
      "contestantName",
      "contestantCode",
      "categoryName",
      "channel",
      "cardLast4",
      "mobileNumber",
      "voteId",
      "initializedAt",
      "paidAt",
      "failedAt",
      "failureReason",
    ];

    const escape = (v: string | number | null | undefined): string => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const lines = [headers.join(",")];
    for (const p of result.rows) {
      lines.push(
        [
          escape(p.reference),
          escape(p.providerRef),
          escape(p.status),
          escape(p.currency),
          escape(p.amountMinor),
          escape(p.amountPaidMinor),
          escape(p.feeMinor),
          escape(p.voterName),
          escape(p.voterEmail),
          escape(p.contestantName),
          escape(p.contestantCode),
          escape(p.categoryName),
          escape(p.channel),
          escape(p.cardLast4),
          escape(p.mobileNumber),
          escape(p.voteId),
          escape(p.initializedAt.toISOString()),
          escape(p.paidAt ? p.paidAt.toISOString() : null),
          escape(p.failedAt ? p.failedAt.toISOString() : null),
          escape(p.failureReason),
        ].join(","),
      );
    }

    const filename = `payments-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(lines.join("\n"));
  }

  @Get("events/:eventId/payments/:paymentId")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN, EventRole.ANALYST)
  async getPayment(
    @Param("eventId") eventId: string,
    @Param("paymentId") paymentId: string,
  ): Promise<PaymentDetailResponseDto> {
    const detail = await this.getPaymentDetailUseCase.execute({
      eventId,
      paymentId,
    });
    return PaymentDetailResponseDto.fromDomain(detail);
  }

  private parseStatus(raw: string | undefined): PaymentStatus | undefined {
    if (!raw) return undefined;
    const upper = raw.toUpperCase();
    const allowed = Object.values(PaymentStatus);
    if (!allowed.includes(upper as PaymentStatus)) {
      throw new BadRequestException(`Invalid status filter: ${raw}`);
    }
    return upper as PaymentStatus;
  }

  private parseDate(raw: string | undefined, name: string): Date | undefined {
    if (!raw) return undefined;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Invalid ${name} date: ${raw}`);
    }
    return d;
  }

  private parsePositiveInt(
    raw: string | undefined,
    name: string,
  ): number | undefined {
    if (!raw) return undefined;
    const value = Number.parseInt(raw, 10);
    if (!Number.isInteger(value) || value < 1) {
      throw new BadRequestException(`${name} must be a positive integer.`);
    }
    return value;
  }
}
