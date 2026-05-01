import * as crypto from "node:crypto";

import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import { appConfig } from "../../../../core/config/app.config";
import { MAGIC_LINK_TOKENS_REPOSITORY, MagicLinkTokensRepository } from "../../../auth/application/ports/magic-link-tokens.repository";
import { CONTESTANTS_REPOSITORY } from "../contestants.tokens";
import { ContestantsRepository } from "../ports/contestants.repository";

const MAGIC_LINK_TTL_DAYS = 7;

@Injectable()
export class RegenerateMagicLinkUseCase {
  constructor(
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
    @Inject(MAGIC_LINK_TOKENS_REPOSITORY)
    private readonly magicLinkTokensRepository: MagicLinkTokensRepository,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
  ) {}

  async execute(contestantId: string): Promise<{ magicLinkUrl: string }> {
    const contestant = await this.contestantsRepository.findById(contestantId);

    if (!contestant) {
      throw new NotFoundException("Contestant was not found.");
    }

    if (!contestant.userId) {
      throw new BadRequestException("This contestant does not have an account yet.");
    }

    await this.magicLinkTokensRepository.invalidateForUser(contestant.userId);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.magicLinkTokensRepository.create({ userId: contestant.userId, token, expiresAt });

    return { magicLinkUrl: `${this.app.frontendOrigin}/auth/magic-link?token=${token}` };
  }
}
