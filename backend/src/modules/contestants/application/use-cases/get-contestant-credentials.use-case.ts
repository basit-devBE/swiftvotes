import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import { appConfig } from "../../../../core/config/app.config";
import { MAGIC_LINK_TOKENS_REPOSITORY, MagicLinkTokensRepository } from "../../../auth/application/ports/magic-link-tokens.repository";
import { CONTESTANTS_REPOSITORY } from "../contestants.tokens";
import { ContestantsRepository } from "../ports/contestants.repository";

export type ContestantCredentials = {
  email: string | null;
  hasAccount: boolean;
  magicLinkUrl: string | null;
};

@Injectable()
export class GetContestantCredentialsUseCase {
  constructor(
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
    @Inject(MAGIC_LINK_TOKENS_REPOSITORY)
    private readonly magicLinkTokensRepository: MagicLinkTokensRepository,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
  ) {}

  async execute(contestantId: string): Promise<ContestantCredentials> {
    const contestant = await this.contestantsRepository.findById(contestantId);

    if (!contestant) {
      throw new NotFoundException("Contestant was not found.");
    }

    if (!contestant.userId) {
      return { email: contestant.email, hasAccount: false, magicLinkUrl: null };
    }

    // Find the most recent unused magic link token for this user
    const token = await this.magicLinkTokensRepository.findLatestUnusedForUser(contestant.userId);

    const magicLinkUrl = token
      ? `${this.app.frontendOrigin}/auth/magic-link?token=${token.token}`
      : null;

    return { email: contestant.email, hasAccount: true, magicLinkUrl };
  }
}
