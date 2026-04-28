import { apiRequest } from "./client";
import { CreateUploadIntentInput, UploadIntentResponse } from "./types";

export function createEventFlyerUploadIntent(
  input: CreateUploadIntentInput,
): Promise<UploadIntentResponse> {
  return apiRequest<UploadIntentResponse>("/uploads/events/flyer-url", {
    method: "POST",
    body: input,
  });
}

export function createEventBannerUploadIntent(
  input: CreateUploadIntentInput,
): Promise<UploadIntentResponse> {
  return apiRequest<UploadIntentResponse>("/uploads/events/banner-url", {
    method: "POST",
    body: input,
  });
}

export function createNominationImageUploadIntent(
  input: CreateUploadIntentInput,
): Promise<UploadIntentResponse> {
  return apiRequest<UploadIntentResponse>("/uploads/nominations/image-url", {
    method: "POST",
    body: input,
  });
}

export async function uploadFileToSignedUrl(
  uploadUrl: string,
  file: File,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Unable to upload file.");
  }
}
