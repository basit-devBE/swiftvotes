import { Injectable } from "@nestjs/common";

import { AppLogger } from "../../../../core/logging/app-logger.service";
import {
  ContestantWelcomePayload,
  EventNotificationPayload,
  NominationReceivedPayload,
  NotificationsService,
  VoteConfirmationPayload,
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

  async sendContestantWelcomeEmail(payload: ContestantWelcomePayload): Promise<void> {
    this.logger.log(
      `Contestant welcome email queued for ${payload.recipientEmail} — code: ${payload.contestantCode}, event: ${payload.eventName}`,
      "Notifications",
    );
  }

  async sendVoteConfirmationEmail(payload: VoteConfirmationPayload): Promise<void> {
    const amount = payload.isFree
      ? "Free"
      : `${payload.currency} ${(payload.amountMinor / 100).toFixed(2)}`;
    this.logger.log(
      `Vote confirmation email queued for ${payload.recipientEmail} — ${payload.quantity} vote(s) for ${payload.contestantName} (${payload.contestantCode}), event ${payload.eventName}, amount ${amount}`,
      "Notifications",
    );
  }
}
