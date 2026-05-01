import { registerAs } from "@nestjs/config";

export const paystackConfig = registerAs("paystack", () => ({
  secretKey: process.env.PAYSTACK_SECRET_KEY ?? "",
  publicKey: process.env.PAYSTACK_PUBLIC_KEY ?? "",
  baseUrl: process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co",
}));

export type PaystackConfig = {
  secretKey: string;
  publicKey: string;
  baseUrl: string;
};
