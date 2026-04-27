import { Nomination } from "../../../domain/nomination";

export class NominationResponseDto {
  id!: string;
  eventId!: string;
  categoryId!: string;
  submittedByUserId!: string | null;
  submitterName!: string;
  submitterEmail!: string;
  nomineeName!: string;
  nomineeEmail!: string | null;
  nomineePhone!: string | null;
  nomineeImageUrl!: string | null;
  nomineeImageKey!: string | null;
  status!: string;
  reviewedByUserId!: string | null;
  reviewedAt!: Date | null;
  rejectionReason!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromDomain(nomination: Nomination): NominationResponseDto {
    return {
      id: nomination.id,
      eventId: nomination.eventId,
      categoryId: nomination.categoryId,
      submittedByUserId: nomination.submittedByUserId,
      submitterName: nomination.submitterName,
      submitterEmail: nomination.submitterEmail,
      nomineeName: nomination.nomineeName,
      nomineeEmail: nomination.nomineeEmail,
      nomineePhone: nomination.nomineePhone,
      nomineeImageUrl: nomination.nomineeImageUrl,
      nomineeImageKey: nomination.nomineeImageKey,
      status: nomination.status,
      reviewedByUserId: nomination.reviewedByUserId,
      reviewedAt: nomination.reviewedAt,
      rejectionReason: nomination.rejectionReason,
      createdAt: nomination.createdAt,
      updatedAt: nomination.updatedAt,
    };
  }
}
