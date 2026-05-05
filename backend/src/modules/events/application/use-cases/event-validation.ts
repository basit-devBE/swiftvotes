import { BadRequestException } from "@nestjs/common";

import {
  CreateDraftEventRecord,
  EventCategoryRecord,
  UpdateDraftEventRecord,
} from "../ports/events.repository";

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

function ensureCategorySet(categories: EventCategoryRecord[]): void {
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
  nominationStartAt?: Date | null;
  nominationEndAt?: Date | null;
  votingStartAt: Date;
  votingEndAt: Date;
}): void {
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
  ensureCategorySet(input.categories);
  validateEventChronology(input);
}

export function validateUpdateEventInput(
  existing: {
    nominationStartAt: Date | null;
    nominationEndAt: Date | null;
    votingStartAt: Date;
    votingEndAt: Date;
  },
  input: UpdateDraftEventRecord,
): void {
  validateEventChronology({
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
  });
}
