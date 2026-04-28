export type EventCategory = {
  id: string;
  eventId: string;
  name: string;
  description: string;
  votePriceMinor: number;
  currency: string;
  imageUrl: string | null;
  imageKey: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};
