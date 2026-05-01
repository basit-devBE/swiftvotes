import { apiRequest } from "./client";
import { MyContestantProfileResponse } from "./types";

export function getMyContestantProfiles(): Promise<MyContestantProfileResponse[]> {
  return apiRequest<MyContestantProfileResponse[]>("/contestants/me");
}
