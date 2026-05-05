import { Inject, Injectable } from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";
import { Event } from "../../domain/event";
import { buildEventSlug } from "./build-event-slug";
import { validateCreateEventInput } from "./event-validation";

export type CreateEventInput = {
  creatorUserId: string;
  name: string;
  description: string;
  primaryFlyerUrl: string;
  primaryFlyerKey: string;
  bannerUrl?: string | null;
  bannerKey?: string | null;
  nominationStartAt?: Date | null;
  nominationEndAt?: Date | null;
  votingStartAt: Date;
  votingEndAt: Date;
  contestantsCanViewOwnVotes?: boolean;
  contestantsCanViewLeaderboard?: boolean;
  publicCanViewLeaderboard?: boolean;
  categories: Array<{
    name: string;
    description: string;
    votePriceMinor: number;
    currency: string;
    imageUrl?: string | null;
    imageKey?: string | null;
    sortOrder: number;
  }>;
};

@Injectable()
export class CreateEventUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(input: CreateEventInput): Promise<Event> {
    const slug = buildEventSlug(input.name);

    validateCreateEventInput({
      ...input,
      slug,
    });

    return this.eventsRepository.createDraftWithOwner({
      ...input,
      slug,
    });
  }
}
