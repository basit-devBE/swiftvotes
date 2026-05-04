import { NominationStatus } from "./nomination-status";

export type Nomination = {
  id: string;
  eventId: string;
  categoryId: string;
  submittedByUserId: string | null;
  submitterName: string;
  submitterEmail: string | null;
  submitterPhone: string | null;
  nomineeName: string;
  nomineeEmail: string | null;
  nomineePhone: string | null;
  nomineeImageUrl: string | null;
  nomineeImageKey: string | null;
  status: NominationStatus;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};
