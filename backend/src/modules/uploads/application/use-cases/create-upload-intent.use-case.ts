import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { UploadsService } from "../ports/uploads.service";
import { UPLOADS_SERVICE } from "../uploads.tokens";

export type UploadAssetKind =
  | "event-flyer"
  | "event-banner"
  | "category-image"
  | "nomination-image";

@Injectable()
export class CreateUploadIntentUseCase {
  constructor(
    @Inject(UPLOADS_SERVICE)
    private readonly uploadsService: UploadsService,
  ) {}

  async execute(input: {
    ownerId: string;
    kind: UploadAssetKind;
    fileName: string;
    contentType: string;
    eventId?: string;
    categoryId?: string;
    nominationId?: string;
  }) {
    const extension = path.extname(input.fileName).replace(".", "").toLowerCase();
    const safeExtension = extension || "bin";
    const key = this.buildKey({
      ownerId: input.ownerId,
      kind: input.kind,
      safeExtension,
      eventId: input.eventId,
      categoryId: input.categoryId,
      nominationId: input.nominationId,
    });

    return this.uploadsService.createSignedUploadIntent({
      key,
      contentType: input.contentType,
    });
  }

  private buildKey(input: {
    ownerId: string;
    kind: UploadAssetKind;
    safeExtension: string;
    eventId?: string;
    categoryId?: string;
    nominationId?: string;
  }): string {
    const id = randomUUID();

    switch (input.kind) {
      case "event-flyer":
        return `${input.eventId ? `events/${input.eventId}` : `draft-events/${input.ownerId}`}/flyer/${id}.${input.safeExtension}`;
      case "event-banner":
        return `${input.eventId ? `events/${input.eventId}` : `draft-events/${input.ownerId}`}/banner/${id}.${input.safeExtension}`;
      case "category-image":
        return `${input.eventId ? `events/${input.eventId}` : `draft-events/${input.ownerId}`}/categories/${input.categoryId ?? id}/${randomUUID()}.${input.safeExtension}`;
      case "nomination-image":
        return `${input.eventId ? `events/${input.eventId}` : `public-events/${input.ownerId}`}/nominations/${input.nominationId ?? id}/${randomUUID()}.${input.safeExtension}`;
      default:
        return `uploads/${input.ownerId}/${id}.${input.safeExtension}`;
    }
  }
}
