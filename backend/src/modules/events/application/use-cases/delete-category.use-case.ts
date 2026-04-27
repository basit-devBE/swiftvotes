import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";
import { EventStatus } from "../../domain/event-status";

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(categoryId: string): Promise<void> {
    const category = await this.eventsRepository.findCategoryById(categoryId);

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

    await this.eventsRepository.deleteCategory(categoryId);
  }
}
