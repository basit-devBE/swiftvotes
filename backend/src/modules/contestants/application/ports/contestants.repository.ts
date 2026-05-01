import { Contestant } from "../../domain/contestant";

export interface ContestantsRepository {
  createFromNomination(input: {
    eventId: string;
    categoryId: string;
    nominationId: string;
    codePrefix: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    imageUrl?: string | null;
    imageKey?: string | null;
  }): Promise<Contestant>;
  findByEvent(eventId: string): Promise<Contestant[]>;
  findByEventAndCategory(eventId: string, categoryId: string): Promise<Contestant[]>;
  findById(contestantId: string): Promise<Contestant | null>;
  updateUserId(contestantId: string, userId: string): Promise<Contestant>;
}
