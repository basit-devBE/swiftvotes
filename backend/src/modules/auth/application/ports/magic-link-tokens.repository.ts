import { MagicLinkToken } from "../../domain/magic-link-token";

export const MAGIC_LINK_TOKENS_REPOSITORY = Symbol("MAGIC_LINK_TOKENS_REPOSITORY");

export interface MagicLinkTokensRepository {
  create(input: { userId: string; token: string; expiresAt: Date }): Promise<MagicLinkToken>;
  findByToken(token: string): Promise<MagicLinkToken | null>;
  findLatestUnusedForUser(userId: string): Promise<MagicLinkToken | null>;
  markUsed(tokenId: string): Promise<void>;
  invalidateForUser(userId: string): Promise<void>;
}
