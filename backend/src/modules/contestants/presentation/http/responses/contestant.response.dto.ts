import { Contestant } from "../../../domain/contestant";

export class ContestantResponseDto {
  id!: string;
  eventId!: string;
  categoryId!: string;
  nominationId!: string;
  userId!: string | null;
  code!: string;
  name!: string;
  email!: string | null;
  phone!: string | null;
  imageUrl!: string | null;
  imageKey!: string | null;
  createdAt!: string;
  updatedAt!: string;

  static fromDomain(contestant: Contestant): ContestantResponseDto {
    return {
      id: contestant.id,
      eventId: contestant.eventId,
      categoryId: contestant.categoryId,
      nominationId: contestant.nominationId,
      userId: contestant.userId,
      code: contestant.code,
      name: contestant.name,
      email: contestant.email,
      phone: contestant.phone,
      imageUrl: contestant.imageUrl,
      imageKey: contestant.imageKey,
      createdAt: contestant.createdAt.toISOString(),
      updatedAt: contestant.updatedAt.toISOString(),
    };
  }
}
