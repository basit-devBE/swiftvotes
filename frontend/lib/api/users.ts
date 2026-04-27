import { apiRequest } from "./client";
import {
  RegisterInput,
  UpdateCurrentUserInput,
  UserResponse,
} from "./types";

export function registerUser(input: RegisterInput): Promise<UserResponse> {
  return apiRequest<UserResponse>("/users", {
    method: "POST",
    body: input,
    skipAuthRetry: true,
  });
}

export function getCurrentUser(): Promise<UserResponse> {
  return apiRequest<UserResponse>("/users/me");
}

export function updateCurrentUser(
  input: UpdateCurrentUserInput,
): Promise<UserResponse> {
  return apiRequest<UserResponse>("/users/me", {
    method: "PATCH",
    body: input,
  });
}
