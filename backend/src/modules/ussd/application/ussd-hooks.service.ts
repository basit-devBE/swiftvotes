import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { PrismaService } from "../../../core/prisma/prisma.service";
import {
  momoProviderPhoneMessage,
  phoneMatchesMomoProvider,
} from "../../../shared/validation/momo-phone";
import { EventStatus } from "../../events/domain/event-status";
import { JunipayService } from "../../junipay/infrastructure/junipay.service";
import { ConfirmVoteUseCase } from "../../votes/application/use-cases/confirm-vote.use-case";
import { Payment } from "../../votes/domain/payment";
import { PaymentStatus } from "../../votes/domain/payment-status";
import { VoteStatus } from "../../votes/domain/vote-status";
import { PAYMENTS_REPOSITORY, VOTES_REPOSITORY } from "../../votes/application/votes.tokens";
import { PaymentsRepository } from "../../votes/application/ports/payments.repository";
import { VotesRepository } from "../../votes/application/ports/votes.repository";

type UssdPayload = Record<string, unknown>;
type MomoProvider = "mtn" | "vodafone" | "airteltigo";

type ResolvedContestant = {
  contestant: {
    id: string;
    code: string;
    name: string;
    eventId: string;
    categoryId: string;
  };
  event: {
    id: string;
    name: string;
    status: string;
  };
  category: {
    id: string;
    name: string;
    votePriceMinor: number;
    currency: string;
  };
};

@Injectable()
export class UssdHooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly junipay: JunipayService,
    private readonly confirmVote: ConfirmVoteUseCase,
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(VOTES_REPOSITORY)
    private readonly votesRepository: VotesRepository,
  ) {}

  async resolveContestant(payload: UssdPayload): Promise<Record<string, string>> {
    const contestantCode = this.requiredString(
      this.getSavedValue(payload, "contestant_code"),
      "contestant_code is required.",
    );
    const resolved = await this.findContestantByCode(contestantCode);

    return {
      contestant_id: resolved.contestant.id,
      contestant_code: resolved.contestant.code,
      contestant_name: resolved.contestant.name,
      event_id: resolved.event.id,
      event_name: resolved.event.name,
      category_id: resolved.category.id,
      category_name: resolved.category.name,
      unit_price: this.formatMoney(
        resolved.category.votePriceMinor,
        resolved.category.currency,
      ),
    };
  }

  async quote(payload: UssdPayload): Promise<Record<string, string>> {
    const resolved = await this.resolveForVote(payload);
    const amountMinor = resolved.quantity * resolved.category.votePriceMinor;

    return {
      contestant_id: resolved.contestant.id,
      contestant_code: resolved.contestant.code,
      contestant_name: resolved.contestant.name,
      event_id: resolved.event.id,
      event_name: resolved.event.name,
      category_id: resolved.category.id,
      category_name: resolved.category.name,
      vote_quantity: String(resolved.quantity),
      unit_price: this.formatMoney(
        resolved.category.votePriceMinor,
        resolved.category.currency,
      ),
      amount: this.formatMoney(amountMinor, resolved.category.currency),
      amount_minor: String(amountMinor),
      currency: resolved.category.currency,
    };
  }

  async createPayment(payload: UssdPayload): Promise<Record<string, string>> {
    const resolved = await this.resolveForVote(payload);
    const phone = this.requiredString(
      this.getPhoneNumber(payload),
      "USSD phone number is required.",
    );
    const provider = this.resolveMomoProvider(
      this.requiredString(
        this.getSavedValue(payload, "momo_provider"),
        "momo_provider is required.",
      ),
    );
    this.assertPhoneMatchesProvider(phone, provider);
    const amountMinor = resolved.quantity * resolved.category.votePriceMinor;
    const voterName = `USSD voter ${phone}`;
    const voterEmail = "basitmohammed362@gmail.com";
    const normalizedPhone = this.toInternationalPhone(phone);

    if (amountMinor === 0) {
      const vote = await this.votesRepository.create({
        eventId: resolved.event.id,
        categoryId: resolved.category.id,
        contestantId: resolved.contestant.id,
        voterName,
        voterEmail,
        quantity: 1,
        amountMinor: 0,
        currency: resolved.category.currency,
        status: VoteStatus.FREE,
      });

      return {
        payment_message: `${vote.quantity} free vote counted for ${resolved.contestant.name}.`,
        payment_reference: "FREE",
        payment_status: "CONFIRMED",
      };
    }

    const reference = `swv_${randomUUID()}`;
    const metadata = {
      source: "ussd",
      ussdProvider: "arkesel",
      ussdOrchestrator: "ussdk",
      ussdSessionId: this.getSessionValue(payload, "sessionId") ?? null,
      serviceCode: this.getSessionValue(payload, "serviceCode") ?? null,
      network: this.getSessionValue(payload, "network") ?? null,
      mobileMoneyProvider: provider,
      phoneNumber: phone,
      normalizedPhoneNumber: normalizedPhone,
      contestantCode: resolved.contestant.code,
      contestantName: resolved.contestant.name,
      eventId: resolved.event.id,
      eventName: resolved.event.name,
      categoryId: resolved.category.id,
      categoryName: resolved.category.name,
      contestantId: resolved.contestant.id,
      quantity: resolved.quantity,
    };

    const createdVote = await this.prisma.$transaction(async (tx) => {
      const payment = await this.paymentsRepository.createPending(
        {
          reference,
          amountMinor,
          currency: resolved.category.currency,
          voterEmail,
          voterName,
          eventId: resolved.event.id,
          categoryId: resolved.category.id,
          contestantId: resolved.contestant.id,
          provider: "junipay",
          channel: "ussd",
          mobileNumber: normalizedPhone,
          rawInitResponse: {
            reference,
            provider: "junipay",
            state: "local_pending",
          },
          metadata: metadata as Prisma.InputJsonValue,
        },
        tx,
      );

      const vote = await this.votesRepository.create(
        {
          eventId: resolved.event.id,
          categoryId: resolved.category.id,
          contestantId: resolved.contestant.id,
          voterName,
          voterEmail,
          quantity: resolved.quantity,
          amountMinor,
          currency: resolved.category.currency,
          status: VoteStatus.PENDING_PAYMENT,
          transactionRef: reference,
        },
        tx,
      );

      await this.paymentsRepository.linkVote(payment.id, vote.id, tx);
      return vote;
    });

    try {
      const init = await this.junipay.initializeMobileMoneyCollection({
        reference,
        phoneNumber: phone,
        provider,
        amountMinor,
        currency: resolved.category.currency,
        senderEmail: voterEmail,
        description: "SwiftVotes vote payment",
        callbackUrl: process.env.JUNIPAY_CALLBACK_URL || null,
      });

      await this.paymentsRepository.updateInitialization({
        reference,
        providerRef: init.providerRef,
        rawInitResponse: init.raw as Prisma.InputJsonValue,
      });
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await this.paymentsRepository.markFailed(
          {
            reference,
            failureReason:
              error instanceof Error ? error.message : "JuniPay request failed.",
            failedAt: new Date(),
          },
          tx,
        );

        const vote = await this.votesRepository.findByTransactionRef(reference);
        if (vote ?? createdVote) {
          await this.votesRepository.updateStatus(
            (vote ?? createdVote).id,
            VoteStatus.FAILED,
            undefined,
            tx,
          );
        }
      });

      throw new ServiceUnavailableException(
        "Could not start mobile money payment.",
      );
    }

    return {
      payment_message: `Payment request sent to ${phone}. Dial *170# and approve the request, or go to Approvals to approve it.`,
      payment_reference: reference,
      payment_status: PaymentStatus.PENDING,
    };
  }

  async paymentStatus(payload: UssdPayload): Promise<Record<string, string>> {
    const reference = this.requiredString(
      this.getSavedValue(payload, "payment_reference") ??
        this.getSavedValue(payload, "reference"),
      "payment_reference is required.",
    );
    const payment = await this.paymentsRepository.findByReference(reference);
    if (!payment) {
      throw new NotFoundException("Payment reference was not found.");
    }

    if (payment.provider === "junipay" && payment.status === PaymentStatus.PENDING) {
      await this.confirmVote.execute(reference).catch(() => undefined);
    }

    const refreshedPayment =
      (await this.paymentsRepository.findByReference(reference)) ?? payment;

    return {
      payment_reference: refreshedPayment.reference,
      payment_status: refreshedPayment.status,
      payment_message: this.paymentStatusMessage(refreshedPayment),
    };
  }

  private async resolveForVote(payload: UssdPayload): Promise<
    ResolvedContestant & { quantity: number }
  > {
    const contestantCode = this.requiredString(
      this.getSavedValue(payload, "contestant_code"),
      "contestant_code is required.",
    );
    const quantity = this.parseQuantity(
      this.requiredString(
        this.getSavedValue(payload, "vote_quantity"),
        "vote_quantity is required.",
      ),
    );
    const resolved = await this.findContestantByCode(contestantCode);
    return { ...resolved, quantity };
  }

  private async findContestantByCode(code: string): Promise<ResolvedContestant> {
    const normalizedCode = this.normalizeContestantCode(code);
    const contestant = await this.prisma.contestant.findFirst({
      where: { code: normalizedCode, deletedAt: null },
      include: { event: true, category: true },
    });

    if (!contestant) {
      throw new NotFoundException("Contestant code was not found.");
    }

    if (contestant.event.status !== EventStatus.VOTING_LIVE) {
      throw new ConflictException("Voting is not currently live for this contestant.");
    }

    return {
      contestant: {
        id: contestant.id,
        code: contestant.code,
        name: contestant.name,
        eventId: contestant.eventId,
        categoryId: contestant.categoryId,
      },
      event: {
        id: contestant.event.id,
        name: contestant.event.name,
        status: contestant.event.status,
      },
      category: {
        id: contestant.category.id,
        name: contestant.category.name,
        votePriceMinor: contestant.category.votePriceMinor,
        currency: contestant.category.currency,
      },
    };
  }

  private normalizeContestantCode(code: string): string {
    const digits = code.replace(/\D/g, "");
    if (!/^\d{1,4}$/.test(digits)) {
      throw new BadRequestException("Contestant code must be a 4 digit number.");
    }
    return digits.padStart(4, "0");
  }

  private getSavedValue(payload: UssdPayload, key: string): string | null {
    const candidates = [
      this.readPath(payload, ["values", key]),
      this.readPath(payload, ["props", "values", key]),
      this.readPath(payload, ["session", "values", key]),
      this.readPath(payload, ["data", "values", key]),
      this.readPath(payload, [key]),
    ];
    const value = candidates.find((candidate) => candidate != null && candidate !== "");
    return typeof value === "string" || typeof value === "number"
      ? String(value).trim()
      : null;
  }

  private getSessionValue(payload: UssdPayload, key: string): string | null {
    const candidates = [
      this.readPath(payload, ["session", key]),
      this.readPath(payload, ["props", "session", key]),
      this.readPath(payload, ["data", "session", key]),
      this.readPath(payload, [key]),
    ];
    const value = candidates.find((candidate) => candidate != null && candidate !== "");
    return typeof value === "string" || typeof value === "number"
      ? String(value).trim()
      : null;
  }

  private getPhoneNumber(payload: UssdPayload): string | null {
    const candidates = [
      this.getSessionValue(payload, "msisdn"),
      this.getSessionValue(payload, "phoneNumber"),
      this.getSessionValue(payload, "phone"),
      this.getSessionValue(payload, "mobile"),
    ];
    const value = candidates.find(Boolean);
    return value ? this.toLocalPhone(value) : null;
  }

  private readPath(source: unknown, path: string[]): unknown {
    return path.reduce<unknown>((current, segment) => {
      if (!current || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[segment];
    }, source);
  }

  private requiredString(value: string | null, message: string): string {
    if (!value) throw new BadRequestException(message);
    return value;
  }

  private parseQuantity(value: string): number {
    const quantity = Number.parseInt(value, 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException("Vote quantity must be a positive number.");
    }
    if (quantity > 10000) {
      throw new BadRequestException("Vote quantity is too high.");
    }
    return quantity;
  }

  private resolveMomoProvider(value: string): MomoProvider {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized.includes("mtn")) return "mtn";
    if (normalized === "2" || normalized.includes("vod") || normalized.includes("telecel")) {
      return "vodafone";
    }
    if (normalized === "3" || normalized.includes("atl") || normalized.includes("airtel")) {
      return "airteltigo";
    }
    throw new BadRequestException("Unsupported payment network.");
  }

  private assertPhoneMatchesProvider(phone: string, provider: MomoProvider): void {
    if (!phoneMatchesMomoProvider(phone, provider)) {
      throw new BadRequestException(momoProviderPhoneMessage(provider));
    }
  }

  private toLocalPhone(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (/^233\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
    return digits;
  }

  private toInternationalPhone(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (/^0\d{9}$/.test(digits)) return `233${digits.slice(1)}`;
    if (/^233\d{9}$/.test(digits)) return digits;
    return digits;
  }

  private formatMoney(minor: number, currency: string): string {
    if (minor === 0) return "Free";
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }

  private paymentStatusMessage(payment: Payment): string {
    const metadata =
      payment?.metadata && typeof payment.metadata === "object"
        ? (payment.metadata as Record<string, unknown>)
        : null;
    const contestantName =
      metadata && typeof metadata.contestantName === "string"
        ? metadata.contestantName
        : "this contestant";
    const quantity =
      metadata && typeof metadata.quantity === "number"
        ? metadata.quantity
        : null;

    if (payment?.status === PaymentStatus.SUCCEEDED) {
      return quantity
        ? `Payment confirmed. ${quantity} vote${quantity > 1 ? "s have" : " has"} been counted for ${contestantName}.`
        : "Payment confirmed. Your votes have been counted.";
    }
    if (payment?.status === PaymentStatus.FAILED) return "Payment failed. No votes were counted.";
    if (payment?.status === PaymentStatus.ABANDONED) return "Payment was not completed. No votes were counted.";
    if (payment?.status === PaymentStatus.REFUNDED) return "Payment was refunded.";
    return "Payment is still pending. Dial *170# and approve the request, or go to Approvals to approve it.";
  }
}
