import { Injectable } from "@nestjs/common";
import {
  Nomination as PrismaNomination,
  NominationStatus as PrismaNominationStatus,
} from "@prisma/client";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import { NominationsRepository } from "../../application/ports/nominations.repository";
import { Nomination } from "../../domain/nomination";
import { NominationStatus } from "../../domain/nomination-status";

@Injectable()
export class PrismaNominationsRepository implements NominationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    eventId: string;
    categoryId: string;
    submittedByUserId?: string | null;
    submitterName: string;
    submitterEmail?: string | null;
    submitterPhone: string;
    nomineeName: string;
    nomineeEmail?: string | null;
    nomineePhone: string;
    nomineeImageUrl?: string | null;
    nomineeImageKey?: string | null;
  }): Promise<Nomination> {
    const nomination = await this.prisma.nomination.create({
      data: {
        eventId: input.eventId,
        categoryId: input.categoryId,
        submittedByUserId: input.submittedByUserId ?? null,
        submitterName: input.submitterName,
        submitterEmail: input.submitterEmail?.trim().toLowerCase() ?? null,
        submitterPhone: input.submitterPhone,
        nomineeName: input.nomineeName,
        nomineeEmail: input.nomineeEmail?.trim().toLowerCase() ?? null,
        nomineePhone: input.nomineePhone,
        nomineeImageUrl: input.nomineeImageUrl ?? null,
        nomineeImageKey: input.nomineeImageKey ?? null,
      },
    });

    return this.toDomain(nomination);
  }

  async findById(nominationId: string): Promise<Nomination | null> {
    const nomination = await this.prisma.nomination.findUnique({
      where: { id: nominationId },
    });

    return nomination ? this.toDomain(nomination) : null;
  }

  async findByEvent(eventId: string): Promise<Nomination[]> {
    const nominations = await this.prisma.nomination.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    });

    return nominations.map((nomination) => this.toDomain(nomination));
  }

  async updateReview(input: {
    nominationId: string;
    status: "CONFIRMED" | "REJECTED";
    reviewedByUserId: string;
    rejectionReason?: string | null;
  }): Promise<Nomination> {
    const nomination = await this.prisma.nomination.update({
      where: { id: input.nominationId },
      data: {
        status: input.status as PrismaNominationStatus,
        reviewedByUserId: input.reviewedByUserId,
        reviewedAt: new Date(),
        rejectionReason: input.rejectionReason ?? null,
      },
    });

    return this.toDomain(nomination);
  }

  private toDomain(nomination: PrismaNomination): Nomination {
    return {
      id: nomination.id,
      eventId: nomination.eventId,
      categoryId: nomination.categoryId,
      submittedByUserId: nomination.submittedByUserId,
      submitterName: nomination.submitterName,
      submitterEmail: nomination.submitterEmail,
      submitterPhone: nomination.submitterPhone,
      nomineeName: nomination.nomineeName,
      nomineeEmail: nomination.nomineeEmail,
      nomineePhone: nomination.nomineePhone,
      nomineeImageUrl: nomination.nomineeImageUrl,
      nomineeImageKey: nomination.nomineeImageKey,
      status: nomination.status as NominationStatus,
      reviewedByUserId: nomination.reviewedByUserId,
      reviewedAt: nomination.reviewedAt,
      rejectionReason: nomination.rejectionReason,
      createdAt: nomination.createdAt,
      updatedAt: nomination.updatedAt,
    };
  }
}
