export type EventNotificationPayload = {
  eventId: string;
  eventName: string;
  recipientEmail: string;
  recipientName: string;
  rejectionReason?: string | null;
};

export interface NotificationsService {
  sendEventPendingApprovalEmail(
    payload: EventNotificationPayload,
  ): Promise<void>;
  sendEventApprovedEmail(payload: EventNotificationPayload): Promise<void>;
  sendEventRejectedEmail(payload: EventNotificationPayload): Promise<void>;
}
