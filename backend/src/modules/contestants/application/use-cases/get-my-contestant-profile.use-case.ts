import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { VOTES_REPOSITORY } from "../../../votes/application/votes.tokens";
import { VotesRepository } from "../../../votes/application/ports/votes.repository";
import { CONTESTANTS_REPOSITORY } from "../contestants.tokens";
import { ContestantWithContext, ContestantsRepository } from "../ports/contestants.repository";

export type ContestantProfileWithVotes = ContestantWithContext & {
  voteCount: number | null;
};

@Injectable()
export class GetMyContestantProfileUseCase {
  constructor(
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
    @Inject(VOTES_REPOSITORY)
    private readonly votesRepository: VotesRepository,
  ) {}

  async execute(userId: string, contestantId: string): Promise<ContestantProfileWithVotes> {
    const profiles = await this.contestantsRepository.findWithContextByUserId(userId);
    const profile = profiles.find((p) => p.id === contestantId);
    if (!profile) {
      throw new NotFoundException("Contestant profile not found.");
    }

    if (!profile.event.contestantsCanViewOwnVotes) {
      return { ...profile, voteCount: null };
    }

    const voteCount = await this.votesRepository.countByContestant(profile.id);
    return { ...profile, voteCount };
  }
}
