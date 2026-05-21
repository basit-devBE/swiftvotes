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
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { appConfig } from "../../../../core/config/app.config";
import { PrismaService } from "../../../../core/prisma/prisma.service";
import { CONTESTANTS_REPOSITORY } from "../../../contestants/application/contestants.tokens";
import { ContestantsRepository } from "../../../contestants/application/ports/contestants.repository";
import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { EventStatus } from "../../../events/domain/event-status";
import { NOTIFICATIONS_SERVICE } from "../../../notifications/application/notifications.tokens";
import { NotificationsService } from "../../../notifications/application/ports/notifications.service";
import { JunipayService } from "../../../junipay/infrastructure/junipay.service";
import { AssertPhoneVerificationUseCase } from "../../../phone-verifications/application/use-cases/assert-phone-verification.use-case";
import { PhoneVerificationPurpose } from "../../../phone-verifications/domain/phone-verification-purpose";
import { PaystackService } from "../../infrastructure/payments/paystack.service";
import { Vote } from "../../domain/vote";
import { VoteStatus } from "../../domain/vote-status";
import { PAYMENTS_REPOSITORY, VOTES_REPOSITORY } from "../votes.tokens";
import { PaymentsRepository } from "../ports/payments.repository";
import { VotesRepository } from "../ports/votes.repository";

const FREE_VOTE_COOLDOWN_MS = 60 * 60 * 1000;

export type CastVoteInput = {
  eventId: string;
  contestantId: string;
  quantity: number;
  voterName: string;
  voterEmail: string;
  voterPhone?: string;
  momoProvider?: "mtn" | "vodafone" | "airteltigo";
  phoneVerificationChallengeId?: string;
  callbackOrigin?: string;
  ipAddress?: string | null;
};

export type CastVoteResult =
  | { type: "free"; vote: Vote }
  | {
      type: "payment";
      voteId: string;
      reference: string;
      paymentUrl: string | null;
      quantity: number;
      amountMinor: number;
      currency: string;
    };

@Injectable()
export class CastVoteUseCase {
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
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
    private readonly paystack: PaystackService,
    private readonly junipay: JunipayService,
    private readonly assertPhoneVerification: AssertPhoneVerificationUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CastVoteInput): Promise<CastVoteResult> {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new BadRequestException("Quantity must be a positive integer.");
    }

    const event = await this.eventsRepository.findById(input.eventId);
    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    if (!event.hasVoting) {
      throw new BadRequestException("Voting is not enabled for this event.");
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

    // Paid path — create a Payment + Vote pair atomically so both rows always
    // exist before asking the provider to collect from the user.
    const amountMinor = input.quantity * category.votePriceMinor;
    const callbackUrl = this.buildCallbackUrl({
      origin: input.callbackOrigin,
      eventId: event.id,
    });

    if (!this.usePaystack()) {
      if (!input.voterPhone || !input.momoProvider || !input.phoneVerificationChallengeId) {
        throw new BadRequestException(
          "Phone verification and mobile money provider are required.",
        );
      }
      const verifiedPhone = await this.assertPhoneVerification.execute({
        challengeId: input.phoneVerificationChallengeId,
        phone: input.voterPhone,
        purpose: PhoneVerificationPurpose.JUNIPAY_COLLECTION,
      });
      const reference = `swv_${randomUUID()}`;
      const rawInitResponse: Prisma.InputJsonValue = {
        reference,
        provider: "junipay",
        state: "local_pending",
      };

      const vote = await this.prisma.$transaction(async (tx) => {
        const payment = await this.paymentsRepository.createPending(
          {
            reference,
            amountMinor,
            currency: category.currency,
            voterEmail,
            voterName,
            customerIp: input.ipAddress ?? null,
            eventId: event.id,
            categoryId: category.id,
            contestantId: contestant.id,
            provider: "junipay",
            channel: "mobile_money",
            mobileNumber: verifiedPhone.normalizedPhone,
            rawInitResponse,
            metadata: {
              purpose: "vote",
              momoProvider: input.momoProvider,
              phoneVerificationChallengeId: verifiedPhone.challengeId,
            },
          },
          tx,
        );

        const createdVote = await this.votesRepository.create(
          {
            eventId: event.id,
            categoryId: category.id,
            contestantId: contestant.id,
            voterName,
            voterEmail,
            quantity: input.quantity,
            amountMinor,
            currency: category.currency,
            status: VoteStatus.PENDING_PAYMENT,
            transactionRef: reference,
            ipAddress: input.ipAddress ?? null,
          },
          tx,
        );

        await this.paymentsRepository.linkVote(payment.id, createdVote.id, tx);

        return createdVote;
      });

      const init = await this.junipay.initializeMobileMoneyCollection({
        reference,
        phoneNumber: verifiedPhone.phone,
        provider: input.momoProvider,
        amountMinor,
        currency: category.currency,
        senderEmail: voterEmail,
        description: "SwiftVotes vote payment",
        callbackUrl: this.buildJunipayCallbackUrl(),
      });

      await this.paymentsRepository.updateInitialization({
        reference,
        providerRef: init.providerRef,
        rawInitResponse: init.raw as Prisma.InputJsonValue,
      });

      return {
        type: "payment",
        voteId: vote.id,
        reference,
        paymentUrl: null,
        quantity: vote.quantity,
        amountMinor: vote.amountMinor,
        currency: vote.currency,
      };
    }

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

    const rawInitResponse: Prisma.InputJsonValue = {
      reference: init.reference,
      authorizationUrl: init.authorizationUrl,
      accessCode: init.accessCode,
    };

    const vote = await this.prisma.$transaction(async (tx) => {
      const payment = await this.paymentsRepository.createPending(
        {
          reference: init.reference,
          amountMinor,
          currency: category.currency,
          voterEmail,
          voterName,
          customerIp: input.ipAddress ?? null,
          eventId: event.id,
          categoryId: category.id,
          contestantId: contestant.id,
          rawInitResponse,
        },
        tx,
      );

      const createdVote = await this.votesRepository.create(
        {
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
        },
        tx,
      );

      await this.paymentsRepository.linkVote(payment.id, createdVote.id, tx);

      return createdVote;
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

  private buildJunipayCallbackUrl(): string | null {
    return process.env.JUNIPAY_CALLBACK_URL || null;
  }

  private usePaystack(): boolean {
    return process.env.USE_PAYSTACK === "true";
  }
}
