import { EventCategory } from "../../../domain/event-category";

export class EventCategoryResponseDto {
  id!: string;
  eventId!: string;
  name!: string;
  description!: string;
  votePriceMinor!: number;
  currency!: string;
  imageUrl!: string | null;
  imageKey!: string | null;
  sortOrder!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static fromDomain(category: EventCategory): EventCategoryResponseDto {
    return {
      id: category.id,
      eventId: category.eventId,
      name: category.name,
      description: category.description,
      votePriceMinor: category.votePriceMinor,
      currency: category.currency,
      imageUrl: category.imageUrl,
      imageKey: category.imageKey,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
