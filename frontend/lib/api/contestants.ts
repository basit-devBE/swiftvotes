import { apiRequest } from "./client";
import { MyContestantProfileResponse, MyContestantSummaryResponse } from "./types";

export function getMyContestantProfiles(): Promise<MyContestantSummaryResponse[]> {
  return apiRequest<MyContestantSummaryResponse[]>("/contestants/me");
}

export function getMyContestantProfile(
  contestantId: string,
): Promise<MyContestantProfileResponse> {
  return apiRequest<MyContestantProfileResponse>(`/contestants/me/${contestantId}`);
}
