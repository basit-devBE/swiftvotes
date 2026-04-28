import { registerAs } from "@nestjs/config";

export const databaseConfig = registerAs("database", () => ({
  url:
    process.env.DATABASE_URL ??
    "postgresql://swiftvote:swiftvote@localhost:5432/swiftvote?schema=public",
}));

export type DatabaseConfig = {
  url: string;
};
