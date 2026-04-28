import { EventMembership } from "../../domain/event-membership";
import { EventRole } from "../../domain/event-role";

export interface EventMembershipsRepository {
  findActiveMembership(
    userId: string,
    eventId: string,
  ): Promise<EventMembership | null>;
  findAllByEvent(eventId: string): Promise<EventMembership[]>;
  create(input: {
    eventId: string;
    userId: string;
    role: EventRole;
    assignedByUserId?: string | null;
  }): Promise<EventMembership>;
}
