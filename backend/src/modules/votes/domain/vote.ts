import { VoteStatus } from "./vote-status";

export type Vote = {
  id: string;
  eventId: string;
  categoryId: string;
  contestantId: string;
  voterName: string;
  voterEmail: string;
  quantity: number;
  amountMinor: number;
  currency: string;
  status: VoteStatus;
  transactionRef: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
};
