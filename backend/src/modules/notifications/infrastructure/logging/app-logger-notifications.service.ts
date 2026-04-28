import { Injectable } from "@nestjs/common";

import { AppLogger } from "../../../../core/logging/app-logger.service";
import {
  EventNotificationPayload,
  NominationReceivedPayload,
  NotificationsService,
} from "../../application/ports/notifications.service";

@Injectable()
export class AppLoggerNotificationsService implements NotificationsService {
  constructor(private readonly logger: AppLogger) {}

  async sendEventPendingApprovalEmail(
    payload: EventNotificationPayload,
  ): Promise<void> {
    this.logger.log(
      `Pending approval email queued for ${payload.recipientEmail} on event ${payload.eventId}`,
      "Notifications",
    );
  }

  async sendEventApprovedEmail(
    payload: EventNotificationPayload,
  ): Promise<void> {
    this.logger.log(
      `Approved email queued for ${payload.recipientEmail} on event ${payload.eventId}`,
      "Notifications",
    );
  }

  async sendEventRejectedEmail(
    payload: EventNotificationPayload,
  ): Promise<void> {
    this.logger.log(
      `Rejected email queued for ${payload.recipientEmail} on event ${payload.eventId}: ${payload.rejectionReason ?? "no reason provided"}`,
      "Notifications",
    );
  }

  async sendAdminNewEventPendingEmail(
    payload: EventNotificationPayload,
  ): Promise<void> {
    this.logger.log(
      `Admin notification queued for new pending event ${payload.eventId} submitted by ${payload.recipientEmail}`,
      "Notifications",
    );
  }

  async sendNominationReceivedEmail(
    payload: NominationReceivedPayload,
  ): Promise<void> {
    this.logger.log(
      `Nomination received email queued for ${payload.recipientEmail} — nominee: ${payload.nomineeName}, category: ${payload.categoryName}, event: ${payload.eventId}`,
      "Notifications",
    );
  }
}
