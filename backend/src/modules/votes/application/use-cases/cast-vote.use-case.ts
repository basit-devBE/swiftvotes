import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import { appConfig } from "../../../../core/config/app.config";
import { CONTESTANTS_REPOSITORY } from "../../../contestants/application/contestants.tokens";
import { ContestantsRepository } from "../../../contestants/application/ports/contestants.repository";
import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { EventStatus } from "../../../events/domain/event-status";
import { NOTIFICATIONS_SERVICE } from "../../../notifications/application/notifications.tokens";
import { NotificationsService } from "../../../notifications/application/ports/notifications.service";
import { PaystackService } from "../../infrastructure/payments/paystack.service";
import { Vote } from "../../domain/vote";
import { VoteStatus } from "../../domain/vote-status";
import { VOTES_REPOSITORY } from "../votes.tokens";
import { VotesRepository } from "../ports/votes.repository";

const FREE_VOTE_COOLDOWN_MS = 60 * 60 * 1000;

export type CastVoteInput = {
  eventId: string;
  contestantId: string;
  quantity: number;
  voterName: string;
  voterEmail: string;
  callbackOrigin?: string;
  ipAddress?: string | null;
};

export type CastVoteResult =
  | { type: "free"; vote: Vote }
  | {
      type: "payment";
      voteId: string;
      reference: string;
      paymentUrl: string;
      quantity: number;
      amountMinor: number;
      currency: string;
    };

@Injectable()
export class CastVoteUseCase {
  constructor(
    @Inject(VOTES_REPOSITORY)
    private readonly votesRepository: VotesRepository,
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
    @Inject(NOTIFICATIONS_SERVICE)
    private readonly notifications: NotificationsService,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
    private readonly paystack: PaystackService,
  ) {}

  async execute(input: CastVoteInput): Promise<CastVoteResult> {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new BadRequestException("Quantity must be a positive integer.");
    }

    const event = await this.eventsRepository.findById(input.eventId);
    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    if (event.status !== EventStatus.VOTING_LIVE) {
      throw new ConflictException("Voting is not currently live for this event.");
    }

    const contestant = await this.contestantsRepository.findById(input.contestantId);
    if (!contestant) {
      throw new NotFoundException("Contestant not found.");
    }

    if (contestant.eventId !== event.id) {
      throw new BadRequestException("Contestant does not belong to this event.");
    }

    const category = event.categories.find((c) => c.id === contestant.categoryId);
    if (!category) {
      throw new NotFoundException("Category not found for this contestant.");
    }

    const voterName = input.voterName.trim();
    const voterEmail = input.voterEmail.trim().toLowerCase();

    if (category.votePriceMinor === 0) {
      if (input.quantity !== 1) {
        throw new BadRequestException(
          "Free votes are limited to 1 per cast.",
        );
      }

      if (input.ipAddress) {
        const since = new Date(Date.now() - FREE_VOTE_COOLDOWN_MS);
        const recent = await this.votesRepository.findRecentFreeVoteByIp({
          contestantId: contestant.id,
          ipAddress: input.ipAddress,
          since,
        });
        if (recent) {
          throw new HttpException(
            "You've already voted for this contestant recently. Please try again later.",
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      const vote = await this.votesRepository.create({
        eventId: event.id,
        categoryId: category.id,
        contestantId: contestant.id,
        voterName,
        voterEmail,
        quantity: input.quantity,
        amountMinor: 0,
        currency: category.currency,
        status: VoteStatus.FREE,
        ipAddress: input.ipAddress ?? null,
      });

      await this.notifications.sendVoteConfirmationEmail({
        recipientEmail: voterEmail,
        recipientName: voterName,
        eventId: event.id,
        eventName: event.name,
        contestantName: contestant.name,
        contestantCode: contestant.code,
        categoryName: category.name,
        quantity: vote.quantity,
        amountMinor: 0,
        currency: category.currency,
        isFree: true,
        votedAt: vote.createdAt,
      });

      return { type: "free", vote };
    }

    // Paid path — initialize a Paystack transaction and create a PENDING_PAYMENT vote.
    const amountMinor = input.quantity * category.votePriceMinor;
    const callbackUrl = this.buildCallbackUrl({
      origin: input.callbackOrigin,
      eventId: event.id,
    });

    const init = await this.paystack.initializeTransaction({
      email: voterEmail,
      amountMinor,
      currency: category.currency,
      callbackUrl,
      metadata: {
        eventId: event.id,
        contestantId: contestant.id,
        categoryId: category.id,
        quantity: input.quantity,
        voterName,
      },
    });

    const vote = await this.votesRepository.create({
      eventId: event.id,
      categoryId: category.id,
      contestantId: contestant.id,
      voterName,
      voterEmail,
      quantity: input.quantity,
      amountMinor,
      currency: category.currency,
      status: VoteStatus.PENDING_PAYMENT,
      transactionRef: init.reference,
      ipAddress: input.ipAddress ?? null,
    });

    return {
      type: "payment",
      voteId: vote.id,
      reference: init.reference,
      paymentUrl: init.authorizationUrl,
      quantity: vote.quantity,
      amountMinor: vote.amountMinor,
      currency: vote.currency,
    };
  }

  private buildCallbackUrl(input: {
    origin?: string;
    eventId: string;
  }): string {
    const origin = input.origin?.trim() || this.app.frontendOrigin;
    const url = new URL("/vote/callback", origin);
    url.searchParams.set("eventId", input.eventId);
    return url.toString();
  }
}
