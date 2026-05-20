import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";
import { Event } from "../../domain/event";
import { EventStatus } from "../../domain/event-status";
import { EventType } from "../../domain/event-type";
import { deriveEventCapabilities } from "../../domain/event-type";
import { SystemRole } from "../../../users/domain/system-role";
import { validateUpdateEventInput } from "./event-validation";

export type UpdateEventInput = {
  eventId: string;
  name?: string;
  description?: string;
  eventType?: EventType;
  hasVoting?: boolean;
  hasTicketing?: boolean;
  primaryFlyerUrl?: string;
  primaryFlyerKey?: string;
  bannerUrl?: string | null;
  bannerKey?: string | null;
  nominationStartAt?: Date | null;
  nominationEndAt?: Date | null;
  votingStartAt?: Date;
  votingEndAt?: Date;
  eventStartAt?: Date | null;
  eventEndAt?: Date | null;
  venueName?: string | null;
  venueAddress?: string | null;
  ticketSalesStartAt?: Date | null;
  ticketSalesEndAt?: Date | null;
  contestantsCanViewOwnVotes?: boolean;
  contestantsCanViewLeaderboard?: boolean;
  publicCanViewLeaderboard?: boolean;
  actorSystemRole?: SystemRole;
};

@Injectable()
export class UpdateEventUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(input: UpdateEventInput): Promise<Event> {
    const event = await this.eventsRepository.findById(input.eventId);

    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    const isSuperAdmin = input.actorSystemRole === SystemRole.SUPER_ADMIN;

    if (
      !isSuperAdmin &&
      ![EventStatus.DRAFT, EventStatus.REJECTED].includes(event.status)
    ) {
      throw new BadRequestException(
        "Only draft or rejected events can be edited.",
      );
    }

    validateUpdateEventInput(event, input);

    const capabilities = deriveEventCapabilities({
      eventType: input.eventType ?? event.eventType,
      hasVoting: input.hasVoting ?? event.hasVoting,
      hasTicketing: input.hasTicketing ?? event.hasTicketing,
    });

    return this.eventsRepository.updateDraft(input.eventId, {
      ...input,
      ...capabilities,
    });
  }
}
