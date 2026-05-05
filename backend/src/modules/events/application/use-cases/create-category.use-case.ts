import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";
import { EventCategory } from "../../domain/event-category";
import { EventStatus } from "../../domain/event-status";
import { assertValidVotePriceMinor } from "./event-validation";

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(input: {
    eventId: string;
    name: string;
    description: string;
    votePriceMinor: number;
    currency: string;
    imageUrl?: string | null;
    imageKey?: string | null;
    sortOrder: number;
  }): Promise<EventCategory> {
    const event = await this.eventsRepository.findById(input.eventId);

    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    if (![EventStatus.DRAFT, EventStatus.REJECTED].includes(event.status)) {
      throw new BadRequestException(
        "Categories can only be changed while an event is draft or rejected.",
      );
    }

    assertValidVotePriceMinor(input.votePriceMinor);

    return this.eventsRepository.createCategory(input.eventId, input);
  }
}
