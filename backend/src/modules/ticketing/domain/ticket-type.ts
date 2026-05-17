export type TicketType = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  priceMinor: number;
  currency: string;
  quantityAvailable: number | null;
  quantitySold: number;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};
