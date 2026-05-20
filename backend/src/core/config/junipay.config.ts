import { registerAs } from "@nestjs/config";

export const junipayConfig = registerAs("junipay", () => ({
  baseUrl: process.env.JUNIPAY_BASE_URL ?? "https://api.junipayments.com",
  clientId: process.env.JUNIPAY_CLIENT_ID ?? "",
  secret: process.env.JUNIPAY_SECRET ?? "",
  tokenLink: process.env.JUNIPAY_TOKEN_LINK ?? "",
  privateKeyBase64: process.env.JUNIPAY_PRIVATE_KEY_BASE64 ?? "",
  publicKeyBase64: process.env.JUNIPAY_PUBLIC_KEY_BASE64 ?? "",
  callbackUrl: process.env.JUNIPAY_CALLBACK_URL ?? "",
}));
