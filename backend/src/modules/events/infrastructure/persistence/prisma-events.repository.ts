import { Injectable } from "@nestjs/common";
import {
  Event as PrismaEvent,
  EventCategory as PrismaEventCategory,
  EventRole as PrismaEventRole,
  EventStatus as PrismaEventStatus,
  EventType as PrismaEventType,
} from "@prisma/client";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import { EventRole } from "../../../access-control/domain/event-role";
import {
  CreateDraftEventRecord,
  EventCategoryRecord,
  EventsRepository,
  UpdateDraftEventRecord,
} from "../../application/ports/events.repository";
import { EventCategory } from "../../domain/event-category";
import { Event } from "../../domain/event";
import { EventStatus } from "../../domain/event-status";
import {
  deriveEventCapabilities,
  deriveLegacyEventType,
  EventType,
} from "../../domain/event-type";

const EVENT_INCLUDE = {
  categories: {
    orderBy: { sortOrder: "asc" as const },
  },
};

type PrismaEventWithCategories = PrismaEvent & {
  categories: PrismaEventCategory[];
};

@Injectable()
export class PrismaEventsRepository implements EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createDraftWithOwner(input: CreateDraftEventRecord): Promise<Event> {
    const capabilities = deriveEventCapabilities({
      eventType: input.eventType,
      hasVoting: input.hasVoting,
      hasTicketing: input.hasTicketing,
    });

    const event = await this.prisma.$transaction(async (tx) => {
      const createdEvent = await tx.event.create({
        data: {
          creatorUserId: input.creatorUserId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          eventType: deriveLegacyEventType(capabilities) as PrismaEventType,
          hasVoting: capabilities.hasVoting,
          hasTicketing: capabilities.hasTicketing,
          primaryFlyerUrl: input.primaryFlyerUrl,
          primaryFlyerKey: input.primaryFlyerKey,
          bannerUrl: input.bannerUrl ?? null,
          bannerKey: input.bannerKey ?? null,
          nominationStartAt: input.nominationStartAt ?? null,
          nominationEndAt: input.nominationEndAt ?? null,
          votingStartAt: input.votingStartAt,
          votingEndAt: input.votingEndAt,
          eventStartAt: input.eventStartAt ?? null,
          eventEndAt: input.eventEndAt ?? null,
          venueName: input.venueName ?? null,
          venueAddress: input.venueAddress ?? null,
          ticketSalesStartAt: input.ticketSalesStartAt ?? null,
          ticketSalesEndAt: input.ticketSalesEndAt ?? null,
          contestantsCanViewOwnVotes: input.contestantsCanViewOwnVotes ?? false,
          contestantsCanViewLeaderboard: input.contestantsCanViewLeaderboard ?? false,
          publicCanViewLeaderboard: input.publicCanViewLeaderboard ?? true,
          categories: input.categories?.length
            ? {
                create: input.categories.map((category) => ({
                  name: category.name,
                  description: category.description,
                  votePriceMinor: category.votePriceMinor,
                  currency: category.currency.trim().toUpperCase(),
                  imageUrl: category.imageUrl ?? null,
                  imageKey: category.imageKey ?? null,
                  sortOrder: category.sortOrder,
                })),
              }
            : undefined,
        },
        include: EVENT_INCLUDE,
      });

      await tx.eventMembership.create({
        data: {
          eventId: createdEvent.id,
          userId: input.creatorUserId,
          role: PrismaEventRole.EVENT_OWNER,
          assignedByUserId: input.creatorUserId,
        },
      });

      return createdEvent;
    });

    return this.toDomainEvent(event);
  }

  async findById(eventId: string): Promise<Event | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: EVENT_INCLUDE,
    });

    return event ? this.toDomainEvent(event) : null;
  }

  async findBySlug(slug: string): Promise<Event | null> {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: EVENT_INCLUDE,
    });

    return event ? this.toDomainEvent(event) : null;
  }

  async findMine(creatorUserId: string): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: { creatorUserId },
      include: EVENT_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return events.map((event) => this.toDomainEvent(event));
  }

  async findAll(): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      include: EVENT_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return events.map((event) => this.toDomainEvent(event));
  }

  async findApproved(): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: {
        status: {
          in: [
            PrismaEventStatus.APPROVED,
            PrismaEventStatus.NOMINATIONS_OPEN,
            PrismaEventStatus.NOMINATIONS_CLOSED,
            PrismaEventStatus.VOTING_SCHEDULED,
            PrismaEventStatus.VOTING_LIVE,
            PrismaEventStatus.VOTING_CLOSED,
          ],
        },
      },
      include: EVENT_INCLUDE,
      orderBy: { approvedAt: "desc" },
    });

    return events.map((event) => this.toDomainEvent(event));
  }

  async findPendingApproval(): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: { status: PrismaEventStatus.PENDING_APPROVAL },
      include: EVENT_INCLUDE,
      orderBy: { submittedAt: "asc" },
    });

    return events.map((event) => this.toDomainEvent(event));
  }

  async findLifecycleCandidates(): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: {
        hasVoting: true,
        status: {
          in: [
            PrismaEventStatus.APPROVED,
            PrismaEventStatus.NOMINATIONS_OPEN,
            PrismaEventStatus.NOMINATIONS_CLOSED,
            PrismaEventStatus.VOTING_SCHEDULED,
            PrismaEventStatus.VOTING_LIVE,
          ],
        },
      },
      include: EVENT_INCLUDE,
    });

    return events.map((event) => this.toDomainEvent(event));
  }

  async countActiveTicketTypes(eventId: string): Promise<number> {
    return this.prisma.ticketType.count({
      where: {
        eventId,
        isActive: true,
      },
    });
  }

  async updateDraft(eventId: string, input: UpdateDraftEventRecord): Promise<Event> {
    const hasCapabilityUpdate =
      input.eventType !== undefined ||
      input.hasVoting !== undefined ||
      input.hasTicketing !== undefined;
    const capabilities = hasCapabilityUpdate
      ? deriveEventCapabilities({
          eventType: input.eventType,
          hasVoting: input.hasVoting,
          hasTicketing: input.hasTicketing,
        })
      : null;

    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        name: input.name,
        description: input.description,
        eventType: capabilities
          ? (deriveLegacyEventType(capabilities) as PrismaEventType)
          : undefined,
        hasVoting: capabilities?.hasVoting,
        hasTicketing: capabilities?.hasTicketing,
        primaryFlyerUrl: input.primaryFlyerUrl,
        primaryFlyerKey: input.primaryFlyerKey,
        bannerUrl: input.bannerUrl,
        bannerKey: input.bannerKey,
        nominationStartAt: input.nominationStartAt,
        nominationEndAt: input.nominationEndAt,
        votingStartAt: input.votingStartAt,
        votingEndAt: input.votingEndAt,
        eventStartAt: input.eventStartAt,
        eventEndAt: input.eventEndAt,
        venueName: input.venueName,
        venueAddress: input.venueAddress,
        ticketSalesStartAt: input.ticketSalesStartAt,
        ticketSalesEndAt: input.ticketSalesEndAt,
        contestantsCanViewOwnVotes: input.contestantsCanViewOwnVotes,
        contestantsCanViewLeaderboard: input.contestantsCanViewLeaderboard,
        publicCanViewLeaderboard: input.publicCanViewLeaderboard,
      },
      include: EVENT_INCLUDE,
    });

    return this.toDomainEvent(event);
  }

  async updateVisibility(eventId: string, input: {
    contestantsCanViewOwnVotes?: boolean;
    contestantsCanViewLeaderboard?: boolean;
    publicCanViewLeaderboard?: boolean;
  }): Promise<Event> {
    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        contestantsCanViewOwnVotes: input.contestantsCanViewOwnVotes,
        contestantsCanViewLeaderboard: input.contestantsCanViewLeaderboard,
        publicCanViewLeaderboard: input.publicCanViewLeaderboard,
      },
      include: EVENT_INCLUDE,
    });
    return this.toDomainEvent(event);
  }

  async updateStatus(input: {
    eventId: string;
    status: EventStatus;
    submittedAt?: Date | null;
    approvedAt?: Date | null;
    approvedByUserId?: string | null;
    rejectedAt?: Date | null;
    rejectedByUserId?: string | null;
    rejectionReason?: string | null;
  }): Promise<Event> {
    const event = await this.prisma.event.update({
      where: { id: input.eventId },
      data: {
        status: input.status as PrismaEventStatus,
        submittedAt: input.submittedAt,
        approvedAt: input.approvedAt,
        approvedByUserId: input.approvedByUserId,
        rejectedAt: input.rejectedAt,
        rejectedByUserId: input.rejectedByUserId,
        rejectionReason: input.rejectionReason,
      },
      include: EVENT_INCLUDE,
    });

    return this.toDomainEvent(event);
  }

  async createCategory(
    eventId: string,
    input: EventCategoryRecord,
  ): Promise<EventCategory> {
    const category = await this.prisma.eventCategory.create({
      data: {
        eventId,
        name: input.name,
        description: input.description,
        votePriceMinor: input.votePriceMinor,
        currency: input.currency.trim().toUpperCase(),
        imageUrl: input.imageUrl ?? null,
        imageKey: input.imageKey ?? null,
        sortOrder: input.sortOrder,
      },
    });

    return this.toDomainCategory(category);
  }

  async updateCategory(
    categoryId: string,
    input: Partial<EventCategoryRecord>,
  ): Promise<EventCategory> {
    const category = await this.prisma.eventCategory.update({
      where: { id: categoryId },
      data: {
        name: input.name,
        description: input.description,
        votePriceMinor: input.votePriceMinor,
        currency: input.currency?.trim().toUpperCase(),
        imageUrl: input.imageUrl,
        imageKey: input.imageKey,
        sortOrder: input.sortOrder,
      },
    });

    return this.toDomainCategory(category);
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await this.prisma.eventCategory.delete({
      where: { id: categoryId },
    });
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.prisma.event.delete({
      where: { id: eventId },
    });
  }

  async findCategoryById(categoryId: string): Promise<EventCategory | null> {
    const category = await this.prisma.eventCategory.findUnique({
      where: { id: categoryId },
    });

    return category ? this.toDomainCategory(category) : null;
  }

  private toDomainEvent(event: PrismaEventWithCategories): Event {
    const capabilities = deriveEventCapabilities({
      eventType: event.eventType as EventType,
      hasVoting: event.hasVoting,
      hasTicketing: event.hasTicketing,
    });

    return {
      id: event.id,
      creatorUserId: event.creatorUserId,
      name: event.name,
      slug: event.slug,
      description: event.description,
      status: event.status as EventStatus,
      eventType: deriveLegacyEventType(capabilities),
      hasVoting: capabilities.hasVoting,
      hasTicketing: capabilities.hasTicketing,
      primaryFlyerUrl: event.primaryFlyerUrl,
      primaryFlyerKey: event.primaryFlyerKey,
      bannerUrl: event.bannerUrl,
      bannerKey: event.bannerKey,
      nominationStartAt: event.nominationStartAt,
      nominationEndAt: event.nominationEndAt,
      votingStartAt: event.votingStartAt,
      votingEndAt: event.votingEndAt,
      eventStartAt: event.eventStartAt,
      eventEndAt: event.eventEndAt,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      ticketSalesStartAt: event.ticketSalesStartAt,
      ticketSalesEndAt: event.ticketSalesEndAt,
      contestantsCanViewOwnVotes: event.contestantsCanViewOwnVotes,
      contestantsCanViewLeaderboard: event.contestantsCanViewLeaderboard,
      publicCanViewLeaderboard: event.publicCanViewLeaderboard,
      submittedAt: event.submittedAt,
      approvedAt: event.approvedAt,
      approvedByUserId: event.approvedByUserId,
      rejectedAt: event.rejectedAt,
      rejectedByUserId: event.rejectedByUserId,
      rejectionReason: event.rejectionReason,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      categories: event.categories.map((category) => this.toDomainCategory(category)),
    };
  }

  private toDomainCategory(category: PrismaEventCategory): EventCategory {
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
