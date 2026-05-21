import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { Contestant } from "../../domain/contestant";
import { CONTESTANTS_REPOSITORY } from "../contestants.tokens";
import { ContestantsRepository } from "../ports/contestants.repository";

@Injectable()
export class DeleteContestantUseCase {
  constructor(
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
  ) {}

  async execute(input: {
    eventId: string;
    contestantId: string;
    deletedByUserId: string;
  }): Promise<Contestant> {
    const contestant = await this.contestantsRepository.findById(input.contestantId);
    if (!contestant) {
      throw new NotFoundException("Contestant was not found.");
    }

    if (contestant.eventId !== input.eventId) {
      throw new BadRequestException("Contestant does not belong to this event.");
    }

    if (contestant.deletedAt) {
      throw new ConflictException("Contestant has already been deleted.");
    }

    return this.contestantsRepository.softDelete(
      input.contestantId,
      input.deletedByUserId,
    );
  }
}
