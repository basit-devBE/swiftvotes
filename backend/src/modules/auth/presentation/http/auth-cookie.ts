import { ConfigType } from "@nestjs/config";
import { CookieOptions } from "express";

import { AppConfig } from "../../../../core/config/app.config";
import { authConfig } from "../../../../core/config/auth.config";

export function buildRefreshCookieOptions(
  app: AppConfig,
  auth: ConfigType<typeof authConfig>,
): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "none",
    secure: app.environment === "production",
    path: "/",
    maxAge: parseDurationToMilliseconds(auth.refreshTtl),
  };
}

export function parseDurationToMilliseconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}
