import { Injectable } from "@nestjs/common";
import { Vote as PrismaVote } from "@prisma/client";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import { VoteStatus } from "../../domain/vote-status";
import { Vote } from "../../domain/vote";
import {
  ContestantVoteCount,
  CreateVoteInput,
  VotesRepository,
} from "../../application/ports/votes.repository";

const COUNTABLE_STATUSES: VoteStatus[] = [VoteStatus.FREE, VoteStatus.CONFIRMED];

@Injectable()
export class PrismaVotesRepository implements VotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateVoteInput): Promise<Vote> {
    const vote = await this.prisma.vote.create({
      data: {
        eventId: input.eventId,
        categoryId: input.categoryId,
        contestantId: input.contestantId,
        voterName: input.voterName,
        voterEmail: input.voterEmail,
        quantity: input.quantity,
        amountMinor: input.amountMinor,
        currency: input.currency,
        status: input.status,
        transactionRef: input.transactionRef ?? null,
        ipAddress: input.ipAddress ?? null,
      },
    });
    return this.toDomain(vote);
  }

  async findById(voteId: string): Promise<Vote | null> {
    const vote = await this.prisma.vote.findUnique({ where: { id: voteId } });
    return vote ? this.toDomain(vote) : null;
  }

  async findByTransactionRef(transactionRef: string): Promise<Vote | null> {
    const vote = await this.prisma.vote.findUnique({
      where: { transactionRef },
    });
    return vote ? this.toDomain(vote) : null;
  }

  async updateStatus(
    voteId: string,
    status: VoteStatus,
    transactionRef?: string | null,
  ): Promise<Vote> {
    const vote = await this.prisma.vote.update({
      where: { id: voteId },
      data: {
        status,
        ...(transactionRef !== undefined ? { transactionRef } : {}),
      },
    });
    return this.toDomain(vote);
  }

  async countByContestant(contestantId: string): Promise<number> {
    const result = await this.prisma.vote.aggregate({
      where: {
        contestantId,
        status: { in: COUNTABLE_STATUSES },
      },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  }

  async countsByEvent(eventId: string): Promise<ContestantVoteCount[]> {
    const rows = await this.prisma.vote.groupBy({
      by: ["contestantId"],
      where: { eventId, status: { in: COUNTABLE_STATUSES } },
      _sum: { quantity: true },
    });
    return rows.map((row) => ({
      contestantId: row.contestantId,
      totalVotes: row._sum.quantity ?? 0,
    }));
  }

  async countsByEventCategory(
    eventId: string,
    categoryId: string,
  ): Promise<ContestantVoteCount[]> {
    const rows = await this.prisma.vote.groupBy({
      by: ["contestantId"],
      where: { eventId, categoryId, status: { in: COUNTABLE_STATUSES } },
      _sum: { quantity: true },
    });
    return rows.map((row) => ({
      contestantId: row.contestantId,
      totalVotes: row._sum.quantity ?? 0,
    }));
  }

  async listByEvent(eventId: string): Promise<Vote[]> {
    const votes = await this.prisma.vote.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    });
    return votes.map((v) => this.toDomain(v));
  }

  private toDomain(vote: PrismaVote): Vote {
    return {
      id: vote.id,
      eventId: vote.eventId,
      categoryId: vote.categoryId,
      contestantId: vote.contestantId,
      voterName: vote.voterName,
      voterEmail: vote.voterEmail,
      quantity: vote.quantity,
      amountMinor: vote.amountMinor,
      currency: vote.currency,
      status: vote.status as VoteStatus,
      transactionRef: vote.transactionRef,
      ipAddress: vote.ipAddress,
      createdAt: vote.createdAt,
      updatedAt: vote.updatedAt,
    };
  }
}
