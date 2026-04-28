import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { EventStatus } from "../../../events/domain/event-status";
import { NOTIFICATIONS_SERVICE } from "../../../notifications/application/notifications.tokens";
import { NotificationsService } from "../../../notifications/application/ports/notifications.service";
import { USERS_REPOSITORY } from "../../../users/application/users.tokens";
import { UsersRepository } from "../../../users/application/ports/users.repository";
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
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(NOTIFICATIONS_SERVICE)
    private readonly notifications: NotificationsService,
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

    const nomination = await this.nominationsRepository.create(input);

    // Fire-and-forget: notify the event owner — do not block the response.
    void this.notifyOwner(event, category.name, input);

    return nomination;
  }

  private async notifyOwner(
    event: { id: string; name: string; creatorUserId: string },
    categoryName: string,
    input: SubmitNominationInput,
  ): Promise<void> {
    try {
      const owner = await this.usersRepository.findById(event.creatorUserId);
      if (!owner) return;

      await this.notifications.sendNominationReceivedEmail({
        eventId: event.id,
        eventName: event.name,
        recipientEmail: owner.email,
        recipientName: owner.fullName,
        nomineeName: input.nomineeName,
        categoryName,
        submitterName: input.submitterName,
      });
    } catch {
      // Notification failure must never break the nomination submission.
    }
  }
}
