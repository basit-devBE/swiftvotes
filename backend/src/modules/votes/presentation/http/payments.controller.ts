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
import { SystemRoles } from "../../../auth/presentation/http/decorators/system-roles.decorator";
import { SystemRole } from "../../../users/domain/system-role";
import { PaymentStatus } from "../../domain/payment-status";
import { GetEventVotesSummaryUseCase } from "../../application/use-cases/get-event-votes-summary.use-case";
import { GetLeaderboardUseCase } from "../../application/use-cases/get-leaderboard.use-case";
import { GetPaymentDetailUseCase } from "../../application/use-cases/get-payment-detail.use-case";
import { ListAllPaymentsUseCase } from "../../application/use-cases/list-all-payments.use-case";
import { ListEventPaymentsUseCase } from "../../application/use-cases/list-event-payments.use-case";
import { EventVotesSummaryResponseDto } from "./responses/event-votes-summary.response.dto";
import { LeaderboardCategoryDto } from "./responses/leaderboard.response.dto";
import {
  PaymentDetailResponseDto,
  PaymentListResponseDto,
} from "./responses/payment.response.dto";

@Controller({ version: "1" })
export class PaymentsController {
  constructor(
    private readonly listEventPaymentsUseCase: ListEventPaymentsUseCase,
    private readonly listAllPaymentsUseCase: ListAllPaymentsUseCase,
    private readonly getPaymentDetailUseCase: GetPaymentDetailUseCase,
    private readonly getEventVotesSummaryUseCase: GetEventVotesSummaryUseCase,
    private readonly getLeaderboardUseCase: GetLeaderboardUseCase,
  ) {}

  @Get("events/:eventId/votes/summary")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN, EventRole.ANALYST)
  async getVotesSummary(
    @Param("eventId") eventId: string,
  ): Promise<EventVotesSummaryResponseDto> {
    const summary = await this.getEventVotesSummaryUseCase.execute(eventId);
    return EventVotesSummaryResponseDto.fromDomain(summary);
  }

  @Get("events/:eventId/votes/leaderboard")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN, EventRole.ANALYST)
  async getAdminLeaderboard(
    @Param("eventId") eventId: string,
  ): Promise<LeaderboardCategoryDto[]> {
    const categories = await this.getLeaderboardUseCase.execute(eventId, {
      skipVisibilityCheck: true,
    });
    return categories.map((c) => LeaderboardCategoryDto.fromDomain(c));
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

  @Get("admin/payments")
  @SystemRoles(SystemRole.SUPER_ADMIN)
  async listAllPayments(
    @Query("status") status: string | undefined,
    @Query("eventId") eventId: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("search") search: string | undefined,
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
  ): Promise<PaymentListResponseDto> {
    const result = await this.listAllPaymentsUseCase.execute({
      status: this.parseStatus(status),
      eventId: eventId?.trim() || undefined,
      from: this.parseDate(from, "from"),
      to: this.parseDate(to, "to"),
      search: search?.trim() || undefined,
      page: this.parsePositiveInt(page, "page"),
      pageSize: this.parsePositiveInt(pageSize, "pageSize"),
    });
    return PaymentListResponseDto.fromAllResult(result);
  }

  @Get("admin/payments.csv")
  @SystemRoles(SystemRole.SUPER_ADMIN)
  async exportAllPaymentsCsv(
    @Query("status") status: string | undefined,
    @Query("eventId") eventId: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("search") search: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.listAllPaymentsUseCase.execute({
      status: this.parseStatus(status),
      eventId: eventId?.trim() || undefined,
      from: this.parseDate(from, "from"),
      to: this.parseDate(to, "to"),
      search: search?.trim() || undefined,
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
      "eventId",
      "eventName",
      "categoryName",
      "contestantName",
      "contestantCode",
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
          escape(p.eventId),
          escape(p.eventName),
          escape(p.categoryName),
          escape(p.contestantName),
          escape(p.contestantCode),
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

    const filename = `payments-all-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(lines.join("\n"));
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
