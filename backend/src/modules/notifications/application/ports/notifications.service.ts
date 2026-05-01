export type EventNotificationPayload = {
  eventId: string;
  eventName: string;
  recipientEmail: string;
  recipientName: string;
  rejectionReason?: string | null;
};

export type NominationReceivedPayload = {
  eventId: string;
  eventName: string;
  recipientEmail: string;
  recipientName: string;
  nomineeName: string;
  categoryName: string;
  submitterName: string;
};

export type ContestantWelcomePayload = {
  recipientEmail: string;
  recipientName: string;
  eventName: string;
  contestantCode: string;
  defaultPassword: string;
  magicLinkUrl: string;
};

export interface NotificationsService {
  sendEventPendingApprovalEmail(
    payload: EventNotificationPayload,
  ): Promise<void>;
  sendEventApprovedEmail(payload: EventNotificationPayload): Promise<void>;
  sendEventRejectedEmail(payload: EventNotificationPayload): Promise<void>;
  sendAdminNewEventPendingEmail(
    payload: EventNotificationPayload,
  ): Promise<void>;
  sendNominationReceivedEmail(
    payload: NominationReceivedPayload,
  ): Promise<void>;
  sendContestantWelcomeEmail(payload: ContestantWelcomePayload): Promise<void>;
}
