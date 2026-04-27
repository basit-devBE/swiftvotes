import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
  name: process.env.APP_NAME ?? "swiftvote-api",
  version: process.env.APP_VERSION ?? "0.1.0",
  environment:
    (process.env.NODE_ENV as
      | "development"
      | "production"
      | "test"
      | undefined) ?? "development",
  port: Number.parseInt(process.env.PORT ?? "3001", 10),
  apiPrefix: process.env.API_PREFIX ?? "api",
}));

export type AppConfig = {
  name: string;
  version: string;
  environment: "development" | "production" | "test";
  port: number;
  apiPrefix: string;
};
