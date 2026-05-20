import { Event } from "../../domain/event";
import { EventCategory } from "../../domain/event-category";
import { EventStatus } from "../../domain/event-status";
import { EventType } from "../../domain/event-type";

export type EventCategoryRecord = {
  name: string;
  description: string;
  votePriceMinor: number;
  currency: string;
  imageUrl?: string | null;
  imageKey?: string | null;
  sortOrder: number;
};

export type CreateDraftEventRecord = {
  creatorUserId: string;
  name: string;
  slug: string;
  description: string;
  eventType?: EventType;
  hasVoting?: boolean;
  hasTicketing?: boolean;
  primaryFlyerUrl: string;
  primaryFlyerKey: string;
  bannerUrl?: string | null;
  bannerKey?: string | null;
  nominationStartAt?: Date | null;
  nominationEndAt?: Date | null;
  votingStartAt: Date;
  votingEndAt: Date;
  eventStartAt?: Date | null;
  eventEndAt?: Date | null;
  venueName?: string | null;
  venueAddress?: string | null;
  ticketSalesStartAt?: Date | null;
  ticketSalesEndAt?: Date | null;
  contestantsCanViewOwnVotes?: boolean;
  contestantsCanViewLeaderboard?: boolean;
  publicCanViewLeaderboard?: boolean;
  categories?: EventCategoryRecord[];
};

export type UpdateDraftEventRecord = {
  name?: string;
  description?: string;
  eventType?: EventType;
  hasVoting?: boolean;
  hasTicketing?: boolean;
  primaryFlyerUrl?: string;
  primaryFlyerKey?: string;
  bannerUrl?: string | null;
  bannerKey?: string | null;
  nominationStartAt?: Date | null;
  nominationEndAt?: Date | null;
  votingStartAt?: Date;
  votingEndAt?: Date;
  eventStartAt?: Date | null;
  eventEndAt?: Date | null;
  venueName?: string | null;
  venueAddress?: string | null;
  ticketSalesStartAt?: Date | null;
  ticketSalesEndAt?: Date | null;
  contestantsCanViewOwnVotes?: boolean;
  contestantsCanViewLeaderboard?: boolean;
  publicCanViewLeaderboard?: boolean;
};

export interface EventsRepository {
  createDraftWithOwner(input: CreateDraftEventRecord): Promise<Event>;
  findById(eventId: string): Promise<Event | null>;
  findBySlug(slug: string): Promise<Event | null>;
  findMine(creatorUserId: string): Promise<Event[]>;
  findAll(): Promise<Event[]>;
  findApproved(): Promise<Event[]>;
  findPendingApproval(): Promise<Event[]>;
  findLifecycleCandidates(): Promise<Event[]>;
  countActiveTicketTypes(eventId: string): Promise<number>;
  updateDraft(eventId: string, input: UpdateDraftEventRecord): Promise<Event>;
  updateVisibility(eventId: string, input: {
    contestantsCanViewOwnVotes?: boolean;
    contestantsCanViewLeaderboard?: boolean;
    publicCanViewLeaderboard?: boolean;
  }): Promise<Event>;
  updateStatus(input: {
    eventId: string;
    status: EventStatus;
    submittedAt?: Date | null;
    approvedAt?: Date | null;
    approvedByUserId?: string | null;
    rejectedAt?: Date | null;
    rejectedByUserId?: string | null;
    rejectionReason?: string | null;
  }): Promise<Event>;
  deleteEvent(eventId: string): Promise<void>;
  createCategory(eventId: string, input: EventCategoryRecord): Promise<EventCategory>;
  updateCategory(
    categoryId: string,
    input: Partial<EventCategoryRecord>,
  ): Promise<EventCategory>;
  deleteCategory(categoryId: string): Promise<void>;
  findCategoryById(categoryId: string): Promise<EventCategory | null>;
}
