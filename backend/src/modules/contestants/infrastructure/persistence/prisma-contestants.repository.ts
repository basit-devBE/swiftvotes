import { Injectable } from "@nestjs/common";
import { Contestant as PrismaContestant, Event as PrismaEvent, EventCategory as PrismaEventCategory } from "@prisma/client";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import { EventStatus } from "../../../events/domain/event-status";
import { buildContestantCode } from "../../domain/build-contestant-code";
import { Contestant } from "../../domain/contestant";
import { ContestantsRepository, ContestantWithContext } from "../../application/ports/contestants.repository";

@Injectable()
export class PrismaContestantsRepository implements ContestantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createFromNomination(input: {
    eventId: string;
    categoryId: string;
    nominationId: string;
    codePrefix: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    imageUrl?: string | null;
    imageKey?: string | null;
  }): Promise<Contestant> {
    const contestant = await this.prisma.$transaction(async (tx) => {
      const count = await tx.contestant.count({
        where: { eventId: input.eventId },
      });

      const code = buildContestantCode(input.codePrefix, count + 1);

      return tx.contestant.create({
        data: {
          eventId: input.eventId,
          categoryId: input.categoryId,
          nominationId: input.nominationId,
          code,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          imageUrl: input.imageUrl ?? null,
          imageKey: input.imageKey ?? null,
        },
      });
    });

    return this.toDomain(contestant);
  }

  async findByEvent(eventId: string): Promise<Contestant[]> {
    const contestants = await this.prisma.contestant.findMany({
      where: { eventId },
      orderBy: { code: "asc" },
    });

    return contestants.map((c) => this.toDomain(c));
  }

  async findByEventAndCategory(
    eventId: string,
    categoryId: string,
  ): Promise<Contestant[]> {
    const contestants = await this.prisma.contestant.findMany({
      where: { eventId, categoryId },
      orderBy: { code: "asc" },
    });

    return contestants.map((c) => this.toDomain(c));
  }

  async findById(contestantId: string): Promise<Contestant | null> {
    const contestant = await this.prisma.contestant.findUnique({
      where: { id: contestantId },
    });

    return contestant ? this.toDomain(contestant) : null;
  }

  async updateUserId(contestantId: string, userId: string): Promise<Contestant> {
    const contestant = await this.prisma.contestant.update({
      where: { id: contestantId },
      data: { userId },
    });
    return this.toDomain(contestant);
  }

  async findWithContextByUserId(userId: string): Promise<ContestantWithContext[]> {
    const rows = await this.prisma.contestant.findMany({
      where: { userId },
      include: { event: true, category: true },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      ...this.toDomain(row),
      event: {
        id: row.event.id,
        name: row.event.name,
        slug: row.event.slug,
        status: row.event.status as EventStatus,
        contestantsCanViewOwnVotes: row.event.contestantsCanViewOwnVotes,
        contestantsCanViewLeaderboard: row.event.contestantsCanViewLeaderboard,
        votingStartAt: row.event.votingStartAt,
        votingEndAt: row.event.votingEndAt,
        primaryFlyerUrl: row.event.primaryFlyerUrl,
        bannerUrl: row.event.bannerUrl,
      },
      category: {
        id: row.category.id,
        name: row.category.name,
      },
    }));
  }

  private toDomain(contestant: PrismaContestant): Contestant {
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
      createdAt: contestant.createdAt,
      updatedAt: contestant.updatedAt,
    };
  }
}
