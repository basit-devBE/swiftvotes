import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PinoLogger } from "nestjs-pino";

import { PaystackService } from "../../../votes/infrastructure/payments/paystack.service";
import { TICKETING_REPOSITORY } from "../ticketing.tokens";
import { TicketingRepository } from "../ports/ticketing.repository";
import { ConfirmTicketOrderUseCase } from "./confirm-ticket-order.use-case";

type PaystackWebhookPayload = {
  event?: string;
  data?: {
    reference?: string;
    status?: string;
    gateway_response?: string;
  };
};

@Injectable()
export class HandleTicketPaymentWebhookUseCase {
  constructor(
    private readonly paystack: PaystackService,
    @Inject(TICKETING_REPOSITORY)
    private readonly ticketingRepository: TicketingRepository,
    private readonly confirmTicketOrder: ConfirmTicketOrderUseCase,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("HandleTicketPaymentWebhookUseCase");
  }

  async execute(input: {
    rawBody: Buffer | string;
    signature: string | undefined;
  }): Promise<void> {
    let payload: PaystackWebhookPayload;
    try {
      payload =
        typeof input.rawBody === "string"
          ? (JSON.parse(input.rawBody) as PaystackWebhookPayload)
          : (JSON.parse(input.rawBody.toString("utf8")) as PaystackWebhookPayload);
    } catch {
      throw new BadRequestException("Malformed webhook payload.");
    }

    const signatureValid = this.paystack.verifyWebhookSignature(
      input.rawBody,
      input.signature,
    );
    const eventType = payload.event ?? "unknown";
    const reference = payload.data?.reference ?? "";
    const payment = reference
      ? await this.ticketingRepository.findPaymentByReference(reference)
      : null;

    let webhookEventId: string | null = null;
    try {
      const recorded = await this.ticketingRepository.recordWebhookEvent({
        reference,
        eventType,
        signatureValid,
        rawPayload: payload as unknown as Prisma.InputJsonValue,
        ticketPaymentId: payment?.id ?? null,
      });
      webhookEventId = recorded.id;
    } catch (err) {
      this.logger.error(
        { scope: "ticket-payments", op: "webhook", err: (err as Error).message },
        "failed to record ticket payment webhook event",
      );
    }

    if (!signatureValid) {
      throw new BadRequestException("Invalid webhook signature.");
    }

    if (!reference) {
      if (webhookEventId) await this.markProcessedSafely(webhookEventId);
      return;
    }

    if (eventType === "charge.success") {
      try {
        await this.confirmTicketOrder.execute(reference);
      } catch (err) {
        this.logger.error(
          {
            scope: "ticket-payments",
            op: "webhook",
            eventType,
            reference,
            err: (err as Error).message,
          },
          "confirm-ticket-order failed inside webhook handler",
        );
      }
    } else if (eventType === "charge.failed") {
      await this.confirmTicketOrder.markFailed(
        reference,
        payload.data?.gateway_response ?? "Payment failed.",
      );
    }

    if (webhookEventId) await this.markProcessedSafely(webhookEventId);
  }

  private async markProcessedSafely(eventId: string): Promise<void> {
    try {
      await this.ticketingRepository.markWebhookProcessed(eventId);
    } catch (err) {
      this.logger.error(
        {
          scope: "ticket-payments",
          op: "webhook",
          eventId,
          err: (err as Error).message,
        },
        "failed to mark ticket payment webhook event as processed",
      );
    }
  }
}
