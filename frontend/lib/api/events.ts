import { apiRequest } from "./client";
import {
  ContestantCredentialsResponse,
  ContestantResponse,
  ConfirmNominationInput,
  CreateEventCategoryInput,
  CreateEventInput,
  EventCategoryResponse,
  EventResponse,
  NominationResponse,
  RejectNominationInput,
  SubmitNominationInput,
  UpdateContestantInput,
  UpdateEventInput,
} from "./types";

export function createEvent(input: CreateEventInput): Promise<EventResponse> {
  return apiRequest<EventResponse>("/events", {
    method: "POST",
    body: input,
  });
}

export function listMyEvents(): Promise<EventResponse[]> {
  return apiRequest<EventResponse[]>("/events/mine");
}

export function listApprovedEvents(): Promise<EventResponse[]> {
  return apiRequest<EventResponse[]>("/events");
}

export function getEvent(eventId: string): Promise<EventResponse> {
  return apiRequest<EventResponse>(`/events/${eventId}`);
}

export function updateEvent(
  eventId: string,
  input: UpdateEventInput,
): Promise<EventResponse> {
  return apiRequest<EventResponse>(`/events/${eventId}`, {
    method: "PATCH",
    body: input,
  });
}

export function updateEventVisibility(
  eventId: string,
  input: {
    contestantsCanViewOwnVotes?: boolean;
    contestantsCanViewLeaderboard?: boolean;
    publicCanViewLeaderboard?: boolean;
  },
): Promise<EventResponse> {
  return apiRequest<EventResponse>(`/events/${eventId}/visibility`, {
    method: "PATCH",
    body: input,
  });
}

export function submitEvent(eventId: string): Promise<EventResponse> {
  return apiRequest<EventResponse>(`/events/${eventId}/submit`, {
    method: "POST",
  });
}

export function resubmitEvent(eventId: string): Promise<EventResponse> {
  return apiRequest<EventResponse>(`/events/${eventId}/resubmit`, {
    method: "POST",
  });
}

export function createCategory(
  eventId: string,
  input: CreateEventCategoryInput,
): Promise<EventCategoryResponse> {
  return apiRequest<EventCategoryResponse>(`/events/${eventId}/categories`, {
    method: "POST",
    body: input,
  });
}

export function listPendingEvents(): Promise<EventResponse[]> {
  return apiRequest<EventResponse[]>("/events/admin/pending");
}

export function listAllAdminEvents(): Promise<EventResponse[]> {
  return apiRequest<EventResponse[]>("/events/admin/all");
}

export function approveEvent(eventId: string): Promise<EventResponse> {
  return apiRequest<EventResponse>(`/events/admin/${eventId}/approve`, {
    method: "POST",
  });
}

export function rejectEvent(
  eventId: string,
  reason: string,
): Promise<EventResponse> {
  return apiRequest<EventResponse>(`/events/admin/${eventId}/reject`, {
    method: "POST",
    body: { reason },
  });
}

export function submitNomination(
  eventId: string,
  input: SubmitNominationInput,
): Promise<NominationResponse> {
  return apiRequest<NominationResponse>(`/events/${eventId}/nominations`, {
    method: "POST",
    body: input,
  });
}

export function listNominations(eventId: string): Promise<NominationResponse[]> {
  return apiRequest<NominationResponse[]>(`/events/${eventId}/nominations`);
}

export function confirmNomination(
  eventId: string,
  nominationId: string,
  input: ConfirmNominationInput = {},
): Promise<NominationResponse> {
  return apiRequest<NominationResponse>(
    `/events/${eventId}/nominations/${nominationId}/confirm`,
    { method: "POST", body: input },
  );
}

export function rejectNomination(
  eventId: string,
  nominationId: string,
  input: RejectNominationInput,
): Promise<NominationResponse> {
  return apiRequest<NominationResponse>(
    `/events/${eventId}/nominations/${nominationId}/reject`,
    { method: "POST", body: input },
  );
}

export function listContestants(
  eventId: string,
  categoryId?: string,
): Promise<ContestantResponse[]> {
  const query = categoryId ? `?categoryId=${categoryId}` : "";
  return apiRequest<ContestantResponse[]>(`/events/${eventId}/contestants${query}`);
}

export function updateContestant(
  eventId: string,
  contestantId: string,
  input: UpdateContestantInput,
): Promise<ContestantResponse> {
  return apiRequest<ContestantResponse>(
    `/events/${eventId}/contestants/${contestantId}`,
    { method: "PATCH", body: input },
  );
}

export function getContestantCredentials(
  eventId: string,
  contestantId: string,
): Promise<ContestantCredentialsResponse> {
  return apiRequest<ContestantCredentialsResponse>(
    `/events/${eventId}/contestants/${contestantId}/credentials`,
  );
}

export function regenerateMagicLink(
  eventId: string,
  contestantId: string,
): Promise<{ magicLinkUrl: string }> {
  return apiRequest<{ magicLinkUrl: string }>(
    `/events/${eventId}/contestants/${contestantId}/magic-link`,
    { method: "POST" },
  );
}
