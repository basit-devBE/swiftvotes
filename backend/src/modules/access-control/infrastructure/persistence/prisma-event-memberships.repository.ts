import { Injectable } from "@nestjs/common";
import {
  EventMembership as PrismaEventMembership,
  EventRole as PrismaEventRole,
  MembershipStatus as PrismaMembershipStatus,
} from "@prisma/client";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import { EventMembershipsRepository } from "../../application/ports/event-memberships.repository";
import { EventMembership } from "../../domain/event-membership";
import { EventRole } from "../../domain/event-role";
import { MembershipStatus } from "../../domain/membership-status";

@Injectable()
export class PrismaEventMembershipsRepository
  implements EventMembershipsRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findActiveMembership(
    userId: string,
    eventId: string,
  ): Promise<EventMembership | null> {
    const membership = await this.prisma.eventMembership.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (!membership || membership.status !== PrismaMembershipStatus.ACTIVE) {
      return null;
    }

    return this.toDomain(membership);
  }

  async findAllByEvent(eventId: string): Promise<EventMembership[]> {
    const memberships = await this.prisma.eventMembership.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((membership) => this.toDomain(membership));
  }

  async create(input: {
    eventId: string;
    userId: string;
    role: EventRole;
    assignedByUserId?: string | null;
  }): Promise<EventMembership> {
    const membership = await this.prisma.eventMembership.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        role: input.role as PrismaEventRole,
        assignedByUserId: input.assignedByUserId ?? null,
      },
    });

    return this.toDomain(membership);
  }

  private toDomain(membership: PrismaEventMembership): EventMembership {
    return {
      id: membership.id,
      eventId: membership.eventId,
      userId: membership.userId,
      role: membership.role as EventRole,
      status: membership.status as MembershipStatus,
      assignedByUserId: membership.assignedByUserId,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    };
  }
}
