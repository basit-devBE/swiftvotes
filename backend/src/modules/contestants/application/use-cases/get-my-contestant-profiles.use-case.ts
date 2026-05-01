import { Inject, Injectable } from "@nestjs/common";

import { CONTESTANTS_REPOSITORY } from "../contestants.tokens";
import { ContestantWithContext, ContestantsRepository } from "../ports/contestants.repository";

@Injectable()
export class GetMyContestantProfilesUseCase {
  constructor(
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
  ) {}

  async execute(userId: string): Promise<ContestantWithContext[]> {
    return this.contestantsRepository.findWithContextByUserId(userId);
  }
}
