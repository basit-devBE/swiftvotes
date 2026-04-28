import { registerAs } from "@nestjs/config";

export const authConfig = registerAs("auth", () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "swiftvote-access-secret",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "swiftvote-refresh-secret",
  accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  refreshTtl: process.env.JWT_REFRESH_TTL ?? "7d",
  refreshCookieName:
    process.env.JWT_REFRESH_COOKIE_NAME ?? "swiftvote_refresh_token",
}));

export type AuthConfig = {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
  refreshCookieName: string;
};
