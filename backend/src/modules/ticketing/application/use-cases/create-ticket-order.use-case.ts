import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { appConfig } from "../../../../core/config/app.config";
import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { EventStatus } from "../../../events/domain/event-status";
import { JunipayService } from "../../../junipay/infrastructure/junipay.service";
import { AssertPhoneVerificationUseCase } from "../../../phone-verifications/application/use-cases/assert-phone-verification.use-case";
import { PhoneVerificationPurpose } from "../../../phone-verifications/domain/phone-verification-purpose";
import { PaystackService } from "../../../votes/infrastructure/payments/paystack.service";
import { TicketOrder } from "../../domain/ticket-order";
import { TICKETING_REPOSITORY } from "../ticketing.tokens";
import { TicketingRepository } from "../ports/ticketing.repository";

export type CreateTicketOrderUseCaseInput = {
  eventId: string;
  items: Array<{
    ticketTypeId: string;
    quantity: number;
  }>;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  momoProvider?: "mtn" | "vodafone" | "airteltigo";
  phoneVerificationChallengeId?: string;
  callbackOrigin?: string;
  ipAddress?: string | null;
};

export type CreateTicketOrderResult = {
  order: TicketOrder;
  reference: string;
  paymentUrl: string | null;
};

const TICKETING_ACTIVE_EVENT_STATUSES = new Set<EventStatus>([
  EventStatus.APPROVED,
  EventStatus.NOMINATIONS_OPEN,
  EventStatus.NOMINATIONS_CLOSED,
  EventStatus.VOTING_SCHEDULED,
  EventStatus.VOTING_LIVE,
  EventStatus.VOTING_CLOSED,
]);

@Injectable()
export class CreateTicketOrderUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(TICKETING_REPOSITORY)
    private readonly ticketingRepository: TicketingRepository,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
    private readonly paystack: PaystackService,
    private readonly junipay: JunipayService,
    private readonly assertPhoneVerification: AssertPhoneVerificationUseCase,
  ) {}

  async execute(
    input: CreateTicketOrderUseCaseInput,
  ): Promise<CreateTicketOrderResult> {
    if (input.items.length === 0) {
      throw new BadRequestException("At least one ticket type is required.");
    }

    const event = await this.eventsRepository.findById(input.eventId);
    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    if (!event.hasTicketing) {
      throw new BadRequestException("Tickets can only be bought for ticketing events.");
    }

    if (!TICKETING_ACTIVE_EVENT_STATUSES.has(event.status)) {
      throw new ConflictException("Ticket sales are not open for this event.");
    }

    this.assertSalesWindowOpen({
      salesStartAt: event.ticketSalesStartAt,
      salesEndAt: event.ticketSalesEndAt,
      now: new Date(),
    });

    const buyerName = input.buyerName.trim();
    const buyerEmail = input.buyerEmail.trim().toLowerCase();
    if (!buyerName) {
      throw new BadRequestException("Buyer name is required.");
    }

    const mergedItems = this.mergeItems(input.items);
    const ticketTypes = await Promise.all(
      mergedItems.map((item) =>
        this.ticketingRepository.findTicketTypeById(item.ticketTypeId),
      ),
    );

    let currency: string | null = null;
    let totalAmountMinor = 0;
    const orderItems: Array<{
      ticketTypeId: string;
      quantity: number;
      unitPriceMinor: number;
      totalAmountMinor: number;
    }> = [];

    for (let index = 0; index < mergedItems.length; index += 1) {
      const item = mergedItems[index];
      const ticketType = ticketTypes[index];

      if (!ticketType) {
        throw new NotFoundException("Ticket type not found.");
      }

      if (ticketType.eventId !== event.id) {
        throw new BadRequestException("Ticket type does not belong to this event.");
      }

      if (!ticketType.isActive) {
        throw new ConflictException(`${ticketType.name} is not available.`);
      }

      this.assertSalesWindowOpen({
        salesStartAt: ticketType.salesStartAt,
        salesEndAt: ticketType.salesEndAt,
        now: new Date(),
        label: ticketType.name,
      });

      if (
        ticketType.quantityAvailable !== null &&
        ticketType.quantitySold + item.quantity > ticketType.quantityAvailable
      ) {
        throw new ConflictException(`${ticketType.name} is sold out or unavailable.`);
      }

      if (currency && ticketType.currency !== currency) {
        throw new BadRequestException("All tickets in one order must use the same currency.");
      }
      currency = ticketType.currency;

      const itemTotal = ticketType.priceMinor * item.quantity;
      totalAmountMinor += itemTotal;
      orderItems.push({
        ticketTypeId: ticketType.id,
        quantity: item.quantity,
        unitPriceMinor: ticketType.priceMinor,
        totalAmountMinor: itemTotal,
      });
    }

    if (!currency) {
      throw new BadRequestException("No ticket currency could be resolved.");
    }

    const callbackUrl = this.buildCallbackUrl({
      origin: input.callbackOrigin,
      eventId: event.id,
    });

    if (!this.usePaystack()) {
      if (!input.buyerPhone || !input.momoProvider || !input.phoneVerificationChallengeId) {
        throw new BadRequestException(
          "Phone verification and mobile money provider are required.",
        );
      }
      const verifiedPhone = await this.assertPhoneVerification.execute({
        challengeId: input.phoneVerificationChallengeId,
        phone: input.buyerPhone,
        purpose: PhoneVerificationPurpose.JUNIPAY_COLLECTION,
      });
      const reference = `swt_${randomUUID()}`;
      const order = await this.ticketingRepository.createPendingOrder({
        eventId: event.id,
        buyerName,
        buyerEmail,
        buyerPhone: verifiedPhone.phone,
        totalAmountMinor,
        currency,
        items: orderItems,
        payment: {
          reference,
          amountMinor: totalAmountMinor,
          provider: "junipay",
          channel: "mobile_money",
          mobileNumber: verifiedPhone.normalizedPhone,
          rawInitResponse: {
            reference,
            provider: "junipay",
            state: "local_pending",
          },
          customerIp: input.ipAddress ?? null,
          metadata: {
            purpose: "ticket_order",
            eventId: event.id,
            momoProvider: input.momoProvider,
            phoneVerificationChallengeId: verifiedPhone.challengeId,
          },
        },
      });

      const init = await this.junipay.initializeMobileMoneyCollection({
        reference,
        phoneNumber: verifiedPhone.phone,
        provider: input.momoProvider,
        amountMinor: totalAmountMinor,
        currency,
        senderEmail: buyerEmail,
        description: "SwiftVotes ticket payment",
        callbackUrl: this.buildJunipayCallbackUrl(),
      });

      await this.ticketingRepository.updatePaymentInitialization({
        reference,
        providerRef: init.providerRef,
        rawInitResponse: init.raw as Prisma.InputJsonValue,
      });

      return {
        order,
        reference,
        paymentUrl: null,
      };
    }

    const init = await this.paystack.initializeTransaction({
      email: buyerEmail,
      amountMinor: totalAmountMinor,
      currency,
      callbackUrl,
      metadata: {
        purpose: "ticket_order",
        eventId: event.id,
        buyerName,
        itemCount: orderItems.length,
      },
    });

    const rawInitResponse: Prisma.InputJsonValue = {
      reference: init.reference,
      authorizationUrl: init.authorizationUrl,
      accessCode: init.accessCode,
    };

    const order = await this.ticketingRepository.createPendingOrder({
      eventId: event.id,
      buyerName,
      buyerEmail,
      buyerPhone: input.buyerPhone?.trim() || null,
      totalAmountMinor,
      currency,
      items: orderItems,
      payment: {
        reference: init.reference,
        amountMinor: totalAmountMinor,
        rawInitResponse,
        customerIp: input.ipAddress ?? null,
        metadata: {
          purpose: "ticket_order",
          eventId: event.id,
        },
      },
    });

    return {
      order,
      reference: init.reference,
      paymentUrl: init.authorizationUrl,
    };
  }

  private mergeItems(
    items: CreateTicketOrderUseCaseInput["items"],
  ): CreateTicketOrderUseCaseInput["items"] {
    const merged = new Map<string, number>();
    for (const item of items) {
      if (!item.ticketTypeId) {
        throw new BadRequestException("Ticket type id is required.");
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException("Ticket quantity must be at least 1.");
      }
      merged.set(item.ticketTypeId, (merged.get(item.ticketTypeId) ?? 0) + item.quantity);
    }
    return Array.from(merged.entries()).map(([ticketTypeId, quantity]) => ({
      ticketTypeId,
      quantity,
    }));
  }

  private assertSalesWindowOpen(input: {
    salesStartAt: Date | null;
    salesEndAt: Date | null;
    now: Date;
    label?: string;
  }): void {
    const name = input.label ? `${input.label} ticket sales` : "Ticket sales";
    if (input.salesStartAt && input.salesStartAt > input.now) {
      throw new ConflictException(`${name} have not opened yet.`);
    }
    if (input.salesEndAt && input.salesEndAt < input.now) {
      throw new ConflictException(`${name} are closed.`);
    }
  }

  private buildCallbackUrl(input: {
    origin?: string;
    eventId: string;
  }): string {
    const origin = input.origin?.trim() || this.app.frontendOrigin;
    const url = new URL("/ticket/callback", origin);
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
