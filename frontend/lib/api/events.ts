import { apiRequest } from "./client";
import {
  CreateEventCategoryInput,
  CreateEventInput,
  EventCategoryResponse,
  EventResponse,
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
