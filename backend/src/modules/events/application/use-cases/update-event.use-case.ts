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
import { validateUpdateEventInput } from "./event-validation";

export type UpdateEventInput = {
  eventId: string;
  name?: string;
  description?: string;
  primaryFlyerUrl?: string;
  primaryFlyerKey?: string;
  bannerUrl?: string | null;
  bannerKey?: string | null;
  nominationStartAt?: Date | null;
  nominationEndAt?: Date | null;
  votingStartAt?: Date;
  votingEndAt?: Date;
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

    if (![EventStatus.DRAFT, EventStatus.REJECTED].includes(event.status)) {
      throw new BadRequestException(
        "Only draft or rejected events can be edited.",
      );
    }

    validateUpdateEventInput(event, input);

    return this.eventsRepository.updateDraft(input.eventId, input);
  }
}
