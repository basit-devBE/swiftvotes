import { registerAs } from "@nestjs/config";

export const smsConfig = registerAs("sms", () => ({
  arkeselApiKey: process.env.SMS_API_KEY ?? process.env.ARKESEL_SMS_API_KEY ?? "",
  arkeselBaseUrl:
    process.env.SMS_BASE_URL ??
    process.env.ARKESEL_SMS_BASE_URL ??
    "https://sms.arkesel.com/api/v2",
  senderId: process.env.SMS_SENDER_ID ?? "SwiftVote",
  enabled: (process.env.SMS_ENABLED ?? "false") === "true",
}));

export type SmsConfig = {
  arkeselApiKey: string;
  arkeselBaseUrl: string;
  senderId: string;
  enabled: boolean;
};
