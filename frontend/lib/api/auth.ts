import { apiRequest } from "./client";
import { AuthSessionResponse, LoginInput } from "./types";

export function login(input: LoginInput): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>("/auth/login", {
    method: "POST",
    body: input,
    skipAuthRetry: true,
  });
}

export function refreshSession(): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>("/auth/refresh", {
    method: "POST",
    skipAuthRetry: true,
  });
}

export function logout(): Promise<{ success: true }> {
  return apiRequest<{ success: true }>("/auth/logout", {
    method: "POST",
    skipAuthRetry: true,
  });
}
