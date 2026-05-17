import { BadRequestException } from "@nestjs/common";

import {
  CreateDraftEventRecord,
  EventCategoryRecord,
  UpdateDraftEventRecord,
} from "../ports/events.repository";
import { EventType } from "../../domain/event-type";

export const MIN_PAID_VOTE_PRICE_MINOR = 50;

export function assertValidVotePriceMinor(votePriceMinor: number): void {
  if (votePriceMinor < 0) {
    throw new BadRequestException("Category vote price cannot be below zero.");
  }

  if (votePriceMinor > 0 && votePriceMinor < MIN_PAID_VOTE_PRICE_MINOR) {
    throw new BadRequestException(
      "Paid category vote price must be at least GHS 0.50 (50 pesewas). Use 0 for free voting.",
    );
  }
}

function normalizeComparableDate(input: Date | null | undefined): number | null {
  return input ? input.getTime() : null;
}

function ensureCategorySet(categories: EventCategoryRecord[] | undefined): void {
  if (!categories || categories.length === 0) {
    throw new BadRequestException("At least one category is required.");
  }

  if (categories.length === 0) {
    throw new BadRequestException("At least one category is required.");
  }

  const baseCurrency = categories[0].currency.trim().toUpperCase();

  for (const category of categories) {
    assertValidVotePriceMinor(category.votePriceMinor);

    if (category.currency.trim().toUpperCase() !== baseCurrency) {
      throw new BadRequestException(
        "All categories in an event must use the same currency.",
      );
    }
  }
}

export function validateEventChronology(input: {
  eventType?: EventType;
  nominationStartAt?: Date | null;
  nominationEndAt?: Date | null;
  votingStartAt: Date;
  votingEndAt: Date;
  eventStartAt?: Date | null;
  eventEndAt?: Date | null;
  ticketSalesStartAt?: Date | null;
  ticketSalesEndAt?: Date | null;
}): void {
  if (input.eventType === EventType.TICKETING) {
    const eventStartAt = normalizeComparableDate(input.eventStartAt);
    const eventEndAt = normalizeComparableDate(input.eventEndAt);
    const ticketSalesStartAt = normalizeComparableDate(input.ticketSalesStartAt);
    const ticketSalesEndAt = normalizeComparableDate(input.ticketSalesEndAt);

    if (!eventStartAt) {
      throw new BadRequestException("Event start date is required for ticketing events.");
    }

    if (!ticketSalesStartAt || !ticketSalesEndAt) {
      throw new BadRequestException(
        "Ticket sales start and end dates are required for ticketing events.",
      );
    }

    if (eventEndAt && eventEndAt <= eventStartAt) {
      throw new BadRequestException("Event end date must be after event start date.");
    }

    if (ticketSalesStartAt >= ticketSalesEndAt) {
      throw new BadRequestException(
        "Ticket sales start date must be before ticket sales end date.",
      );
    }

    if (ticketSalesEndAt > eventStartAt) {
      throw new BadRequestException(
        "Ticket sales end date cannot be after the event start date.",
      );
    }

    return;
  }

  const nominationStartAt = normalizeComparableDate(input.nominationStartAt);
  const nominationEndAt = normalizeComparableDate(input.nominationEndAt);
  const votingStartAt = input.votingStartAt.getTime();
  const votingEndAt = input.votingEndAt.getTime();

  if (nominationStartAt && nominationEndAt && nominationStartAt > nominationEndAt) {
    throw new BadRequestException(
      "Nomination start date cannot be after nomination end date.",
    );
  }

  if (nominationEndAt && nominationEndAt > votingStartAt) {
    throw new BadRequestException(
      "Nomination end date cannot be after voting start date.",
    );
  }

  if (votingStartAt >= votingEndAt) {
    throw new BadRequestException(
      "Voting start date must be before voting end date.",
    );
  }
}

export function validateCreateEventInput(input: CreateDraftEventRecord): void {
  if ((input.eventType ?? EventType.VOTING) === EventType.VOTING) {
    ensureCategorySet(input.categories);
  }
  validateEventChronology(input);
}

export function validateUpdateEventInput(
  existing: {
    eventType?: EventType;
    nominationStartAt: Date | null;
    nominationEndAt: Date | null;
    votingStartAt: Date;
    votingEndAt: Date;
    eventStartAt?: Date | null;
    eventEndAt?: Date | null;
    ticketSalesStartAt?: Date | null;
    ticketSalesEndAt?: Date | null;
  },
  input: UpdateDraftEventRecord,
): void {
  validateEventChronology({
    eventType: input.eventType ?? existing.eventType,
    nominationStartAt:
      input.nominationStartAt === undefined
        ? existing.nominationStartAt
        : input.nominationStartAt,
    nominationEndAt:
      input.nominationEndAt === undefined
        ? existing.nominationEndAt
        : input.nominationEndAt,
    votingStartAt: input.votingStartAt ?? existing.votingStartAt,
    votingEndAt: input.votingEndAt ?? existing.votingEndAt,
    eventStartAt:
      input.eventStartAt === undefined ? existing.eventStartAt : input.eventStartAt,
    eventEndAt:
      input.eventEndAt === undefined ? existing.eventEndAt : input.eventEndAt,
    ticketSalesStartAt:
      input.ticketSalesStartAt === undefined
        ? existing.ticketSalesStartAt
        : input.ticketSalesStartAt,
    ticketSalesEndAt:
      input.ticketSalesEndAt === undefined
        ? existing.ticketSalesEndAt
        : input.ticketSalesEndAt,
  });
}
