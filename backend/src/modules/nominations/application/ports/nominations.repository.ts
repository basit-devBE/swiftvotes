import { Nomination } from "../../domain/nomination";

export interface NominationsRepository {
  create(input: {
    eventId: string;
    categoryId: string;
    submittedByUserId?: string | null;
    submitterName: string;
    submitterEmail: string;
    nomineeName: string;
    nomineeEmail?: string | null;
    nomineePhone?: string | null;
    nomineeImageUrl?: string | null;
    nomineeImageKey?: string | null;
  }): Promise<Nomination>;
  findById(nominationId: string): Promise<Nomination | null>;
  findByEvent(eventId: string): Promise<Nomination[]>;
  updateReview(input: {
    nominationId: string;
    status: "CONFIRMED" | "REJECTED";
    reviewedByUserId: string;
    rejectionReason?: string | null;
  }): Promise<Nomination>;
}
