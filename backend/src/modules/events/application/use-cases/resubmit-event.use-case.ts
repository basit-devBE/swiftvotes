import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { SubmitEventUseCase } from "./submit-event.use-case";
import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";
import { Event } from "../../domain/event";
import { EventStatus } from "../../domain/event-status";

@Injectable()
export class ResubmitEventUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    private readonly submitEventUseCase: SubmitEventUseCase,
  ) {}

  async execute(eventId: string): Promise<Event> {
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    if (event.status !== EventStatus.REJECTED) {
      throw new BadRequestException(
        "Only rejected events can be resubmitted.",
      );
    }

    return this.submitEventUseCase.execute(eventId);
  }
}
