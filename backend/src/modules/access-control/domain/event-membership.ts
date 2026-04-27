import { EventRole } from "./event-role";
import { MembershipStatus } from "./membership-status";

export type EventMembership = {
  id: string;
  eventId: string;
  userId: string;
  role: EventRole;
  status: MembershipStatus;
  assignedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
