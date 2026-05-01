import { Injectable } from "@nestjs/common";
import { MagicLinkToken as PrismaMagicLinkToken } from "@prisma/client";

import { PrismaService } from "../../../../core/prisma/prisma.service";
import { MagicLinkToken } from "../../domain/magic-link-token";
import { MagicLinkTokensRepository } from "../../application/ports/magic-link-tokens.repository";

@Injectable()
export class PrismaMagicLinkTokensRepository implements MagicLinkTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: { userId: string; token: string; expiresAt: Date }): Promise<MagicLinkToken> {
    const record = await this.prisma.magicLinkToken.create({
      data: {
        userId: input.userId,
        token: input.token,
        expiresAt: input.expiresAt,
      },
    });
    return this.toDomain(record);
  }

  async findByToken(token: string): Promise<MagicLinkToken | null> {
    const record = await this.prisma.magicLinkToken.findUnique({ where: { token } });
    return record ? this.toDomain(record) : null;
  }

  async findLatestUnusedForUser(userId: string): Promise<MagicLinkToken | null> {
    const record = await this.prisma.magicLinkToken.findFirst({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    return record ? this.toDomain(record) : null;
  }

  async markUsed(tokenId: string): Promise<void> {
    await this.prisma.magicLinkToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async invalidateForUser(userId: string): Promise<void> {
    await this.prisma.magicLinkToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  private toDomain(record: PrismaMagicLinkToken): MagicLinkToken {
    return {
      id: record.id,
      userId: record.userId,
      token: record.token,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    };
  }
}
