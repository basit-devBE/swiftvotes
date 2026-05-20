import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { ConfirmVoteUseCase } from "../../../votes/application/use-cases/confirm-vote.use-case";
import { ConfirmTicketOrderUseCase } from "../../application/use-cases/confirm-ticket-order.use-case";

@Public()
@Controller("junipay/webhook")
export class JunipayWebhooksController {
  constructor(
    private readonly confirmTicketOrder: ConfirmTicketOrderUseCase,
    private readonly confirmVote: ConfirmVoteUseCase,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("JunipayWebhooksController");
  }

  @Post()
  @HttpCode(200)
  async handle(@Body() body: Record<string, unknown>): Promise<{ received: true }> {
    const reference = this.extractReference(body);
    if (!reference) {
      this.logger.warn(
        { scope: "junipay", op: "webhook", body },
        "junipay webhook missing reference",
      );
      return { received: true };
    }

    try {
      await this.confirmTicketOrder.execute(reference);
      return { received: true };
    } catch (error) {
      if (!this.isNotFound(error)) {
        this.logger.warn(
          { scope: "junipay", op: "webhook", reference, error },
          "ticket order confirmation failed from junipay webhook",
        );
        return { received: true };
      }
    }

    try {
      await this.confirmVote.execute(reference);
    } catch (error) {
      this.logger.warn(
        { scope: "junipay", op: "webhook", reference, error },
        "vote confirmation failed from junipay webhook",
      );
    }

    return { received: true };
  }

  private extractReference(body: Record<string, unknown>): string | null {
    const data =
      body.data && typeof body.data === "object" && !Array.isArray(body.data)
        ? (body.data as Record<string, unknown>)
        : body;
    for (const key of [
      "foreignID",
      "foreignId",
      "reference",
      "transID",
      "transactionID",
      "transactionId",
    ]) {
      const value = data[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number") return String(value);
    }
    return null;
  }

  private isNotFound(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "getStatus" in error &&
      typeof (error as { getStatus: () => number }).getStatus === "function" &&
      (error as { getStatus: () => number }).getStatus() === 404
    );
  }
}
