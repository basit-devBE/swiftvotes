import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PinoLogger } from "nestjs-pino";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import { CONTESTANTS_REPOSITORY } from "../../../contestants/application/contestants.tokens";
import { ContestantsRepository } from "../../../contestants/application/ports/contestants.repository";
import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { NOTIFICATIONS_SERVICE } from "../../../notifications/application/notifications.tokens";
import { NotificationsService } from "../../../notifications/application/ports/notifications.service";
import { PaystackService } from "../../infrastructure/payments/paystack.service";
import { Vote } from "../../domain/vote";
import { VoteStatus } from "../../domain/vote-status";
import { PAYMENTS_REPOSITORY, VOTES_REPOSITORY } from "../votes.tokens";
import { PaymentsRepository } from "../ports/payments.repository";
import { VotesRepository } from "../ports/votes.repository";

export type ConfirmVoteResult = {
  vote: Vote;
  alreadyResolved: boolean;
};

@Injectable()
export class ConfirmVoteUseCase {
  constructor(
    @Inject(VOTES_REPOSITORY)
    private readonly votesRepository: VotesRepository,
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
    @Inject(NOTIFICATIONS_SERVICE)
    private readonly notifications: NotificationsService,
    private readonly paystack: PaystackService,
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("ConfirmVoteUseCase");
  }

  async execute(reference: string): Promise<ConfirmVoteResult> {
    const vote = await this.votesRepository.findByTransactionRef(reference);
    if (!vote) {
      throw new NotFoundException("No vote found for this reference.");
    }

    if (vote.status === VoteStatus.CONFIRMED || vote.status === VoteStatus.FAILED) {
      this.logger.info(
        { scope: "votes", op: "confirm", reference, currentStatus: vote.status },
        "vote already resolved, skipping",
      );
      return { vote, alreadyResolved: true };
    }

    if (vote.status !== VoteStatus.PENDING_PAYMENT) {
      this.logger.warn(
        { scope: "votes", op: "confirm", reference, currentStatus: vote.status },
        "vote is not in a confirmable state",
      );
      return { vote, alreadyResolved: true };
    }

    const verification = await this.paystack.verifyTransaction(reference);
    const rawVerifyResponse = verification.raw as Prisma.InputJsonValue;

    if (verification.status === "success") {
      const updated = await this.prisma.$transaction(async (tx) => {
        await this.paymentsRepository.markSucceeded(
          {
            reference,
            providerRef: verification.providerRef,
            amountPaidMinor: verification.amount,
            feeMinor: verification.fees,
            paidAt: verification.paidAt
              ? new Date(verification.paidAt)
              : new Date(),
            channel: verification.channel,
            cardLast4: verification.cardLast4,
            mobileNumber: verification.mobileNumber,
            rawVerifyResponse,
          },
          tx,
        );
        return this.votesRepository.updateStatus(
          vote.id,
          VoteStatus.CONFIRMED,
          undefined,
          tx,
        );
      });
      this.logger.info(
        { scope: "votes", op: "confirm", reference, voteId: updated.id, decision: "confirmed" },
        "vote confirmed via Paystack",
      );
      await this.dispatchConfirmationEmail(updated);
      return { vote: updated, alreadyResolved: false };
    }

    if (verification.status === "failed" || verification.status === "abandoned") {
      const updated = await this.prisma.$transaction(async (tx) => {
        await this.paymentsRepository.markFailed(
          {
            reference,
            providerRef: verification.providerRef,
            failureReason:
              verification.gatewayResponse ?? `paystack:${verification.status}`,
            failedAt: new Date(),
            rawVerifyResponse,
          },
          tx,
        );
        return this.votesRepository.updateStatus(
          vote.id,
          VoteStatus.FAILED,
          undefined,
          tx,
        );
      });
      this.logger.warn(
        {
          scope: "votes",
          op: "confirm",
          reference,
          voteId: updated.id,
          decision: "failed",
          paystackStatus: verification.status,
        },
        "vote marked failed",
      );
      return { vote: updated, alreadyResolved: false };
    }

    // Pending — leave both rows as-is and let the webhook resolve them.
    this.logger.info(
      { scope: "votes", op: "confirm", reference, paystackStatus: verification.status },
      "vote still pending after verify",
    );
    return { vote, alreadyResolved: true };
  }

  async markFailed(reference: string): Promise<void> {
    const vote = await this.votesRepository.findByTransactionRef(reference);
    if (!vote) {
      this.logger.warn(
        { scope: "votes", op: "mark-failed", reference },
        "no vote found for reference",
      );
      return;
    }
    if (vote.status === VoteStatus.CONFIRMED || vote.status === VoteStatus.FAILED) {
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      await this.paymentsRepository.markFailed(
        {
          reference,
          failureReason: "paystack:webhook-failed",
          failedAt: new Date(),
        },
        tx,
      );
      await this.votesRepository.updateStatus(
        vote.id,
        VoteStatus.FAILED,
        undefined,
        tx,
      );
    });
    this.logger.warn(
      { scope: "votes", op: "mark-failed", reference, voteId: vote.id },
      "vote marked failed via webhook",
    );
  }

  private async dispatchConfirmationEmail(vote: Vote): Promise<void> {
    const event = await this.eventsRepository.findById(vote.eventId);
    if (!event) return;
    const contestant = await this.contestantsRepository.findById(vote.contestantId);
    if (!contestant) return;
    const category = event.categories.find((c) => c.id === vote.categoryId);
    if (!category) return;

    await this.notifications.sendVoteConfirmationEmail({
      recipientEmail: vote.voterEmail,
      recipientName: vote.voterName,
      eventId: event.id,
      eventName: event.name,
      contestantName: contestant.name,
      contestantCode: contestant.code,
      categoryName: category.name,
      quantity: vote.quantity,
      amountMinor: vote.amountMinor,
      currency: vote.currency,
      isFree: false,
      votedAt: vote.updatedAt,
    });
  }
}
