export enum EventType {
  VOTING = "VOTING",
  TICKETING = "TICKETING",
}

export function deriveEventCapabilities(input: {
  eventType?: EventType;
  hasVoting?: boolean;
  hasTicketing?: boolean;
}): { hasVoting: boolean; hasTicketing: boolean } {
  if (input.hasVoting !== undefined || input.hasTicketing !== undefined) {
    return {
      hasVoting: input.hasVoting ?? false,
      hasTicketing: input.hasTicketing ?? false,
    };
  }

  return input.eventType === EventType.TICKETING
    ? { hasVoting: false, hasTicketing: true }
    : { hasVoting: true, hasTicketing: false };
}

export function deriveLegacyEventType(input: {
  hasVoting: boolean;
  hasTicketing: boolean;
}): EventType {
  if (input.hasTicketing && !input.hasVoting) {
    return EventType.TICKETING;
  }
  return EventType.VOTING;
}
