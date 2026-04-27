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

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(input: {
    categoryId: string;
    name?: string;
    description?: string;
    votePriceMinor?: number;
    currency?: string;
    imageUrl?: string | null;
    imageKey?: string | null;
    sortOrder?: number;
  }): Promise<EventCategory> {
    const category = await this.eventsRepository.findCategoryById(input.categoryId);

    if (!category) {
      throw new NotFoundException("Category was not found.");
    }

    const event = await this.eventsRepository.findById(category.eventId);

    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    if (![EventStatus.DRAFT, EventStatus.REJECTED].includes(event.status)) {
      throw new BadRequestException(
        "Categories can only be changed while an event is draft or rejected.",
      );
    }

    if (input.votePriceMinor !== undefined && input.votePriceMinor < 0) {
      throw new BadRequestException("Vote price cannot be below zero.");
    }

    return this.eventsRepository.updateCategory(input.categoryId, input);
  }
}
