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

export function listUsers(): Promise<UserResponse[]> {
  return apiRequest<UserResponse[]>("/users");
}

export function changeUserStatus(
  userId: string,
  status: "ACTIVE" | "SUSPENDED",
): Promise<UserResponse> {
  return apiRequest<UserResponse>(`/users/${userId}/status`, {
    method: "PATCH",
    body: { status },
  });
}
