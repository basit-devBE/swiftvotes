import { ApiErrorPayload } from "./types";

type ApiClientConfig = {
  getAccessToken: () => string | null;
  refreshSession: () => Promise<boolean>;
  onAuthFailure: () => void;
};

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  accessToken?: string | null;
  headers?: HeadersInit;
  skipAuthRetry?: boolean;
};

const apiClientConfig: ApiClientConfig = {
  getAccessToken: () => null,
  refreshSession: async () => false,
  onAuthFailure: () => undefined,
};

export class ApiClientError extends Error {
  status: number;
  payload?: ApiErrorPayload | string | null;

  constructor(
    message: string,
    status: number,
    payload?: ApiErrorPayload | string | null,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

export function configureApiClient(config: Partial<ApiClientConfig>): void {
  if (config.getAccessToken) {
    apiClientConfig.getAccessToken = config.getAccessToken;
  }

  if (config.refreshSession) {
    apiClientConfig.refreshSession = config.refreshSession;
  }

  if (config.onAuthFailure) {
    apiClientConfig.onAuthFailure = config.onAuthFailure;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";
  const headers = new Headers(options.headers);
  const accessToken = options.accessToken ?? apiClientConfig.getAccessToken();

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && !options.skipAuthRetry) {
    const refreshed = await apiClientConfig.refreshSession();

    if (refreshed) {
      return apiRequest<T>(path, {
        ...options,
        accessToken: apiClientConfig.getAccessToken(),
        skipAuthRetry: true,
      });
    }

    apiClientConfig.onAuthFailure();
  }

  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new ApiClientError(
      getErrorMessage(payload),
      response.status,
      payload,
    );
  }

  return payload as T;
}

async function parseResponsePayload(
  response: Response,
): Promise<ApiErrorPayload | string | null> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as ApiErrorPayload;
  }

  return response.text();
}

function getErrorMessage(payload: ApiErrorPayload | string | null): string {
  if (!payload) {
    return "Something went wrong.";
  }

  if (typeof payload === "string") {
    return payload || "Something went wrong.";
  }

  if (Array.isArray(payload.message)) {
    return payload.message.join(" ");
  }

  return payload.message ?? payload.error ?? "Something went wrong.";
}
