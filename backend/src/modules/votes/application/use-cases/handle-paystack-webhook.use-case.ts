import { BadRequestException, Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

import { PaystackService } from "../../infrastructure/payments/paystack.service";
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
    private readonly confirmVote: ConfirmVoteUseCase,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("HandlePaystackWebhookUseCase");
  }

  async execute(input: {
    rawBody: Buffer | string;
    signature: string | undefined;
  }): Promise<void> {
    if (!this.paystack.verifyWebhookSignature(input.rawBody, input.signature)) {
      this.logger.warn(
        { scope: "paystack", op: "webhook", decision: "deny", reason: "invalid_signature" },
        "rejected webhook with invalid signature",
      );
      throw new BadRequestException("Invalid webhook signature.");
    }

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

    const eventType = payload.event;
    const reference = payload.data?.reference;

    if (!reference) {
      this.logger.warn(
        { scope: "paystack", op: "webhook", eventType, reason: "missing_reference" },
        "webhook missing data.reference",
      );
      return;
    }

    this.logger.info(
      { scope: "paystack", op: "webhook", eventType, reference },
      "webhook received",
    );

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
      return;
    }

    if (eventType === "charge.failed") {
      await this.confirmVote.markFailed(reference);
      return;
    }

    this.logger.info(
      { scope: "paystack", op: "webhook", eventType, reference },
      "unhandled webhook event type",
    );
  }
}
