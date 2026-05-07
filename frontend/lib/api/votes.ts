import { apiRequest } from "./client";
import {
  CastVoteInput,
  CastVoteResponse,
  EventVotesSummaryResponse,
  LeaderboardCategory,
  ListPaymentsFilters,
  PaymentDetailResponse,
  PaymentListResponse,
  VerifyVoteResponse,
} from "./types";

export function castVote(
  eventId: string,
  input: CastVoteInput,
): Promise<CastVoteResponse> {
  return apiRequest<CastVoteResponse>(`/events/${eventId}/votes`, {
    method: "POST",
    body: input,
  });
}

export function verifyVote(
  eventId: string,
  reference: string,
): Promise<VerifyVoteResponse> {
  const qs = new URLSearchParams({ reference }).toString();
  return apiRequest<VerifyVoteResponse>(
    `/events/${eventId}/votes/verify?${qs}`,
  );
}

export function getLeaderboard(
  eventId: string,
): Promise<LeaderboardCategory[]> {
  return apiRequest<LeaderboardCategory[]>(`/events/${eventId}/leaderboard`);
}

export function getAdminLeaderboard(
  eventId: string,
): Promise<LeaderboardCategory[]> {
  return apiRequest<LeaderboardCategory[]>(
    `/events/${eventId}/votes/leaderboard`,
  );
}

function buildPaymentsQuery(filters: ListPaymentsFilters = {}): string {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  if (filters.page) qs.set("page", String(filters.page));
  if (filters.pageSize) qs.set("pageSize", String(filters.pageSize));
  const raw = qs.toString();
  return raw ? `?${raw}` : "";
}

export function getEventVotesSummary(
  eventId: string,
): Promise<EventVotesSummaryResponse> {
  return apiRequest<EventVotesSummaryResponse>(
    `/events/${eventId}/votes/summary`,
  );
}

export function listEventPayments(
  eventId: string,
  filters: ListPaymentsFilters = {},
): Promise<PaymentListResponse> {
  return apiRequest<PaymentListResponse>(
    `/events/${eventId}/payments${buildPaymentsQuery(filters)}`,
  );
}

export function getEventPayment(
  eventId: string,
  paymentId: string,
): Promise<PaymentDetailResponse> {
  return apiRequest<PaymentDetailResponse>(
    `/events/${eventId}/payments/${paymentId}`,
  );
}

export function exportEventPaymentsCsv(
  eventId: string,
  filters: Omit<ListPaymentsFilters, "page" | "pageSize"> = {},
): Promise<string> {
  return apiRequest<string>(
    `/events/${eventId}/payments.csv${buildPaymentsQuery(filters)}`,
  );
}
