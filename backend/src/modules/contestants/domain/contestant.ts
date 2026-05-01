export type Contestant = {
  id: string;
  eventId: string;
  categoryId: string;
  nominationId: string;
  userId: string | null;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  imageKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};
