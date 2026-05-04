import { apiRequest } from "./client";
import {
  CastVoteInput,
  CastVoteResponse,
  LeaderboardCategory,
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
