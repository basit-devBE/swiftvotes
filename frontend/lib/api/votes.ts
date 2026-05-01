import { apiRequest } from "./client";
import {
  CastVoteInput,
  CastVoteResponse,
  LeaderboardCategory,
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

export function getLeaderboard(
  eventId: string,
): Promise<LeaderboardCategory[]> {
  return apiRequest<LeaderboardCategory[]>(`/events/${eventId}/leaderboard`);
}
