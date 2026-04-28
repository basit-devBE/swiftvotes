import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import { storageConfig } from "../../../../core/config/storage.config";
import { SignedUploadIntent, UploadsService } from "../../application/ports/uploads.service";

@Injectable()
export class S3UploadsService implements UploadsService {
  private readonly client: S3Client;

  constructor(
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {
    this.client = new S3Client({
      region: config.region,
      // Prevent the SDK from adding CRC32 checksum params to presigned URLs by
      // default (SDK v3 ≥ 3.6xx does this automatically). Without this flag the
      // browser PUT fails with 403 because the plain fetch() doesn't send the
      // required x-amz-checksum-crc32 header.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
    });
  }

  async createSignedUploadIntent(input: {
    key: string;
    contentType: string;
  }): Promise<SignedUploadIntent> {
    if (!this.config.bucketName) {
      throw new InternalServerErrorException("S3 bucket is not configured.");
    }

    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: input.key,
      ContentType: input.contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: this.config.signedUrlTtlSeconds,
    });

    const publicUrl = this.config.publicBaseUrl
      ? `${this.config.publicBaseUrl.replace(/\/$/, "")}/${input.key}`
      : `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${input.key}`;

    return {
      key: input.key,
      uploadUrl,
      publicUrl,
      expiresInSeconds: this.config.signedUrlTtlSeconds,
    };
  }
}
