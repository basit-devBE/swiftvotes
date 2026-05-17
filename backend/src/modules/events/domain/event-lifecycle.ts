import { Event } from "./event";
import { EventStatus } from "./event-status";
import { EventType } from "./event-type";

export function determineEventStatusForTimestamp(
  event: Pick<
    Event,
    | "approvedAt"
    | "nominationStartAt"
    | "nominationEndAt"
    | "votingStartAt"
    | "votingEndAt"
    | "eventType"
  >,
  now: Date,
): EventStatus {
  if (event.eventType === EventType.TICKETING) {
    return EventStatus.APPROVED;
  }

  if (event.votingEndAt <= now) {
    return EventStatus.VOTING_CLOSED;
  }

  const nominationEndAt = event.nominationEndAt ?? event.votingStartAt;

  if (nominationEndAt <= now) {
    return event.votingStartAt <= now
      ? EventStatus.VOTING_LIVE
      : EventStatus.VOTING_SCHEDULED;
  }

  const nominationStartAt = event.nominationStartAt ?? event.approvedAt;

  if (nominationStartAt && nominationStartAt <= now) {
    return EventStatus.NOMINATIONS_OPEN;
  }

  return EventStatus.APPROVED;
}
