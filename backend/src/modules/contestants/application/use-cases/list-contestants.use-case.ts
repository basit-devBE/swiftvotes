import { Inject, Injectable } from "@nestjs/common";

import { Contestant } from "../../domain/contestant";
import { CONTESTANTS_REPOSITORY } from "../contestants.tokens";
import { ContestantsRepository } from "../ports/contestants.repository";

@Injectable()
export class ListContestantsUseCase {
  constructor(
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
  ) {}

  async execute(eventId: string, categoryId?: string): Promise<Contestant[]> {
    if (categoryId) {
      return this.contestantsRepository.findByEventAndCategory(eventId, categoryId);
    }
    return this.contestantsRepository.findByEvent(eventId);
  }
}
