import { registerAs } from "@nestjs/config";

export const emailConfig = registerAs("email", () => ({
  host: process.env.SMTP_HOST ?? "",
  port: Number.parseInt(process.env.SMTP_PORT ?? "587", 10),
  secure: (process.env.SMTP_SECURE ?? "false") === "true",
  user: process.env.SMTP_USER ?? "",
  pass: process.env.SMTP_PASS ?? "",
  from: process.env.EMAIL_FROM ?? "SwiftVote <no-reply@swiftvote.app>",
  adminEmail: process.env.SUPER_ADMIN_EMAIL ?? "",
}));

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  adminEmail: string;
};
