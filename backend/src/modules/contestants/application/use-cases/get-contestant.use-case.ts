import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { Contestant } from "../../domain/contestant";
import { CONTESTANTS_REPOSITORY } from "../contestants.tokens";
import { ContestantsRepository } from "../ports/contestants.repository";

@Injectable()
export class GetContestantUseCase {
  constructor(
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
  ) {}

  async execute(contestantId: string): Promise<Contestant> {
    const contestant = await this.contestantsRepository.findById(contestantId);

    if (!contestant) {
      throw new NotFoundException("Contestant was not found.");
    }

    return contestant;
  }
}
