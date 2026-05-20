import { EventResponse, EventType } from "@/lib/api/types";

type EventCapabilitiesInput = {
  eventType?: EventType | string | null;
  hasVoting?: boolean | null;
  hasTicketing?: boolean | null;
};

export function hasVotingEnabled(event: EventCapabilitiesInput): boolean {
  if (typeof event.hasVoting === "boolean") {
    return event.hasVoting;
  }
  return event.eventType !== "TICKETING";
}

export function hasTicketingEnabled(event: EventCapabilitiesInput): boolean {
  if (typeof event.hasTicketing === "boolean") {
    return event.hasTicketing;
  }
  return event.eventType === "TICKETING";
}

export function deriveLegacyEventType(input: {
  hasVoting: boolean;
  hasTicketing: boolean;
}): EventType {
  if (input.hasTicketing && !input.hasVoting) {
    return "TICKETING";
  }
  return "VOTING";
}

export function getEventModeLabel(event: EventCapabilitiesInput): string {
  const hasVoting = hasVotingEnabled(event);
  const hasTicketing = hasTicketingEnabled(event);

  if (hasVoting && hasTicketing) return "Voting & Ticketing";
  if (hasTicketing) return "Ticketing";
  return "Voting";
}

export function getEventModeSearchTokens(event: EventResponse): string[] {
  const hasVoting = hasVotingEnabled(event);
  const hasTicketing = hasTicketingEnabled(event);

  return [
    event.eventType,
    hasVoting ? "voting" : "",
    hasTicketing ? "ticketing" : "",
    hasVoting && hasTicketing ? "hybrid" : "",
  ].filter(Boolean);
}
