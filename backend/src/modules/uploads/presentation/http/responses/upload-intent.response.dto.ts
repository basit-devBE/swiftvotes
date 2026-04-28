import { SignedUploadIntent } from "../../../application/ports/uploads.service";

export class UploadIntentResponseDto {
  key!: string;
  uploadUrl!: string;
  publicUrl!: string;
  expiresInSeconds!: number;

  static fromResult(result: SignedUploadIntent): UploadIntentResponseDto {
    return {
      key: result.key,
      uploadUrl: result.uploadUrl,
      publicUrl: result.publicUrl,
      expiresInSeconds: result.expiresInSeconds,
    };
  }
}
