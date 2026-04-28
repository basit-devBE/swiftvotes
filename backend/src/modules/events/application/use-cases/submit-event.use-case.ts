import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { USERS_REPOSITORY } from "../../../users/application/users.tokens";
import { UsersRepository } from "../../../users/application/ports/users.repository";
import { NOTIFICATIONS_SERVICE } from "../../../notifications/application/notifications.tokens";
import { NotificationsService } from "../../../notifications/application/ports/notifications.service";
import { Event } from "../../domain/event";
import { EventStatus } from "../../domain/event-status";
import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";

@Injectable()
export class SubmitEventUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(NOTIFICATIONS_SERVICE)
    private readonly notificationsService: NotificationsService,
  ) {}

  async execute(eventId: string): Promise<Event> {
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    if (![EventStatus.DRAFT, EventStatus.REJECTED].includes(event.status)) {
      throw new BadRequestException(
        "Only draft or rejected events can be submitted.",
      );
    }

    if (event.categories.length === 0) {
      throw new BadRequestException(
        "Event must contain at least one category before submission.",
      );
    }

    const updated = await this.eventsRepository.updateStatus({
      eventId,
      status: EventStatus.PENDING_APPROVAL,
      submittedAt: new Date(),
      rejectedAt: null,
      rejectedByUserId: null,
      rejectionReason: null,
    });

    const creator = await this.usersRepository.findById(event.creatorUserId);

    if (creator) {
      await this.notificationsService.sendEventPendingApprovalEmail({
        eventId: updated.id,
        eventName: updated.name,
        recipientEmail: creator.email,
        recipientName: creator.fullName,
      });

      await this.notificationsService.sendAdminNewEventPendingEmail({
        eventId: updated.id,
        eventName: updated.name,
        recipientEmail: creator.email,
        recipientName: creator.fullName,
      });
    }

    return updated;
  }
}
