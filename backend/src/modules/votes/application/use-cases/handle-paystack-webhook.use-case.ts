import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PinoLogger } from "nestjs-pino";

import { PaystackService } from "../../infrastructure/payments/paystack.service";
import { PAYMENTS_REPOSITORY } from "../votes.tokens";
import { PaymentsRepository } from "../ports/payments.repository";
import { ConfirmVoteUseCase } from "./confirm-vote.use-case";

type PaystackWebhookPayload = {
  event?: string;
  data?: {
    reference?: string;
    status?: string;
  };
};

@Injectable()
export class HandlePaystackWebhookUseCase {
  constructor(
    private readonly paystack: PaystackService,
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepository: PaymentsRepository,
    private readonly confirmVote: ConfirmVoteUseCase,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("HandlePaystackWebhookUseCase");
  }

  async execute(input: {
    rawBody: Buffer | string;
    signature: string | undefined;
  }): Promise<void> {
    // Step 1 — parse. If we can't even parse the body, there is nothing to record.
    let payload: PaystackWebhookPayload;
    try {
      payload =
        typeof input.rawBody === "string"
          ? (JSON.parse(input.rawBody) as PaystackWebhookPayload)
          : (JSON.parse(input.rawBody.toString("utf8")) as PaystackWebhookPayload);
    } catch {
      this.logger.warn(
        { scope: "paystack", op: "webhook", reason: "invalid_json" },
        "rejected webhook with invalid JSON",
      );
      throw new BadRequestException("Malformed webhook payload.");
    }

    // Step 2 — verify signature. Capture validity but do not throw yet, so we can
    // record the attempt (including spoofing attempts) in the audit log.
    const signatureValid = this.paystack.verifyWebhookSignature(
      input.rawBody,
      input.signature,
    );

    const eventType = payload.event ?? "unknown";
    const reference = payload.data?.reference ?? "";
    const payment = reference
      ? await this.paymentsRepository.findByReference(reference)
      : null;

    // Step 3 — append-only audit log. Best-effort: do not let a record failure
    // block webhook handling.
    let webhookEventId: string | null = null;
    try {
      const recorded = await this.paymentsRepository.recordWebhookEvent({
        reference,
        eventType,
        signatureValid,
        rawPayload: payload as unknown as Prisma.InputJsonValue,
        paymentId: payment?.id ?? null,
      });
      webhookEventId = recorded.id;
    } catch (err) {
      this.logger.error(
        { scope: "paystack", op: "webhook", err: (err as Error).message },
        "failed to record webhook event",
      );
    }

    // Step 4 — reject invalid signatures after recording.
    if (!signatureValid) {
      this.logger.warn(
        { scope: "paystack", op: "webhook", decision: "deny", reason: "invalid_signature", eventType, reference },
        "rejected webhook with invalid signature",
      );
      throw new BadRequestException("Invalid webhook signature.");
    }

    if (!reference) {
      this.logger.warn(
        { scope: "paystack", op: "webhook", eventType, reason: "missing_reference" },
        "webhook missing data.reference",
      );
      if (webhookEventId) {
        await this.markProcessedSafely(webhookEventId);
      }
      return;
    }

    this.logger.info(
      { scope: "paystack", op: "webhook", eventType, reference },
      "webhook received",
    );

    // Step 5 — branch on event type. ConfirmVoteUseCase already does the
    // idempotency check by inspecting current Vote/Payment status.
    if (eventType === "charge.success") {
      try {
        await this.confirmVote.execute(reference);
      } catch (err) {
        // Idempotent — log and swallow so Paystack does not retry forever.
        this.logger.error(
          {
            scope: "paystack",
            op: "webhook",
            eventType,
            reference,
            err: (err as Error).message,
          },
          "confirm-vote use case failed inside webhook handler",
        );
      }
    } else if (eventType === "charge.failed") {
      await this.confirmVote.markFailed(reference);
    } else {
      this.logger.info(
        { scope: "paystack", op: "webhook", eventType, reference },
        "unhandled webhook event type",
      );
    }

    if (webhookEventId) {
      await this.markProcessedSafely(webhookEventId);
    }
  }

  private async markProcessedSafely(eventId: string): Promise<void> {
    try {
      await this.paymentsRepository.markWebhookProcessed(eventId);
    } catch (err) {
      this.logger.error(
        { scope: "paystack", op: "webhook", eventId, err: (err as Error).message },
        "failed to mark webhook event as processed",
      );
    }
  }
}
