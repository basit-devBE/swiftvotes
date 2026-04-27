import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { EventStatus } from "../../../events/domain/event-status";
import { NOMINATIONS_REPOSITORY } from "../nominations.tokens";
import { NominationsRepository } from "../ports/nominations.repository";
import { Nomination } from "../../domain/nomination";

export type SubmitNominationInput = {
  eventId: string;
  categoryId: string;
  submittedByUserId?: string | null;
  submitterName: string;
  submitterEmail: string;
  nomineeName: string;
  nomineeEmail?: string | null;
  nomineePhone?: string | null;
  nomineeImageUrl?: string | null;
  nomineeImageKey?: string | null;
};

@Injectable()
export class SubmitNominationUseCase {
  constructor(
    @Inject(NOMINATIONS_REPOSITORY)
    private readonly nominationsRepository: NominationsRepository,
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(input: SubmitNominationInput): Promise<Nomination> {
    const event = await this.eventsRepository.findById(input.eventId);

    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    if (event.status !== EventStatus.NOMINATIONS_OPEN) {
      throw new BadRequestException("Nominations are not currently open.");
    }

    const category = await this.eventsRepository.findCategoryById(input.categoryId);

    if (!category || category.eventId !== event.id) {
      throw new NotFoundException("Category was not found for this event.");
    }

    return this.nominationsRepository.create(input);
  }
}
