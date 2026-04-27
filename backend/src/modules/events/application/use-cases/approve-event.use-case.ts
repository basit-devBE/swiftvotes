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
import { determineEventStatusForTimestamp } from "../../domain/event-lifecycle";
import { EventStatus } from "../../domain/event-status";
import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";

@Injectable()
export class ApproveEventUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(NOTIFICATIONS_SERVICE)
    private readonly notificationsService: NotificationsService,
  ) {}

  async execute(input: {
    eventId: string;
    reviewerUserId: string;
  }): Promise<Event> {
    const event = await this.eventsRepository.findById(input.eventId);

    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    if (event.status !== EventStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        "Only pending events can be approved.",
      );
    }

    const approvedAt = new Date();
    const nextStatus = determineEventStatusForTimestamp(
      {
        approvedAt,
        nominationStartAt: event.nominationStartAt,
        nominationEndAt: event.nominationEndAt,
        votingStartAt: event.votingStartAt,
        votingEndAt: event.votingEndAt,
      },
      approvedAt,
    );

    const updated = await this.eventsRepository.updateStatus({
      eventId: input.eventId,
      status: nextStatus,
      approvedAt,
      approvedByUserId: input.reviewerUserId,
      rejectedAt: null,
      rejectedByUserId: null,
      rejectionReason: null,
    });

    const creator = await this.usersRepository.findById(updated.creatorUserId);

    if (creator) {
      await this.notificationsService.sendEventApprovedEmail({
        eventId: updated.id,
        eventName: updated.name,
        recipientEmail: creator.email,
        recipientName: creator.fullName,
      });
    }

    return updated;
  }
}
