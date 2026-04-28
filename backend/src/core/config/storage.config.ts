import { registerAs } from "@nestjs/config";

export const storageConfig = registerAs("storage", () => ({
  bucketName: process.env.AWS_S3_BUCKET_NAME ?? "swiftvote-assets",
  region: process.env.AWS_S3_REGION ?? "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  publicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL ?? "",
  signedUrlTtlSeconds: Number.parseInt(
    process.env.AWS_S3_SIGNED_URL_TTL_SECONDS ?? "900",
    10,
  ),
}));

export type StorageConfig = {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  signedUrlTtlSeconds: number;
};
