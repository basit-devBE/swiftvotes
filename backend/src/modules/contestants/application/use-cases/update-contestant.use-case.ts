import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { Contestant } from "../../domain/contestant";
import { CONTESTANTS_REPOSITORY } from "../contestants.tokens";
import {
  ContestantsRepository,
  UpdateContestantDetailsRecord,
} from "../ports/contestants.repository";

@Injectable()
export class UpdateContestantUseCase {
  constructor(
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(input: {
    eventId: string;
    contestantId: string;
    categoryId?: string;
    name?: string;
    phone?: string | null;
    imageUrl?: string | null;
    imageKey?: string | null;
  }): Promise<Contestant> {
    const contestant = await this.contestantsRepository.findById(
      input.contestantId,
    );

    if (!contestant || contestant.eventId !== input.eventId) {
      throw new NotFoundException("Contestant was not found.");
    }

    const event = await this.eventsRepository.findById(input.eventId);

    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    if (
      input.categoryId !== undefined &&
      !event.categories.some((category) => category.id === input.categoryId)
    ) {
      throw new BadRequestException("Category does not belong to this event.");
    }

    const name = input.name?.trim();
    if (input.name !== undefined && !name) {
      throw new BadRequestException("Contestant name is required.");
    }

    const changes: UpdateContestantDetailsRecord = {
      categoryId: input.categoryId,
      name,
      phone: input.phone === undefined ? undefined : input.phone?.trim() ?? null,
      imageUrl: input.imageUrl,
      imageKey: input.imageKey,
    };

    const hasChanges = Object.values(changes).some(
      (value) => value !== undefined,
    );

    if (!hasChanges) {
      return contestant;
    }

    return this.contestantsRepository.updateDetails(
      input.contestantId,
      changes,
    );
  }
}
