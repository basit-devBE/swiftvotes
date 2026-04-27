export type UserResponse = {
  id: string;
  email: string;
  fullName: string;
  systemRole: "SUPER_ADMIN" | "NONE";
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
};

export type AuthSessionResponse = {
  accessToken: string;
  accessTokenExpiresIn: string;
  user: UserResponse;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  fullName: string;
  password: string;
};

export type UpdateCurrentUserInput = {
  fullName: string;
};

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type ApiErrorPayload = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};
