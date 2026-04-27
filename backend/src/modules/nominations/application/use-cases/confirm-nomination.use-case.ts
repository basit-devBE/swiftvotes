import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { NOMINATIONS_REPOSITORY } from "../nominations.tokens";
import { NominationsRepository } from "../ports/nominations.repository";
import { Nomination } from "../../domain/nomination";
import { NominationStatus } from "../../domain/nomination-status";

@Injectable()
export class ConfirmNominationUseCase {
  constructor(
    @Inject(NOMINATIONS_REPOSITORY)
    private readonly nominationsRepository: NominationsRepository,
  ) {}

  async execute(input: {
    nominationId: string;
    reviewerUserId: string;
  }): Promise<Nomination> {
    const nomination = await this.nominationsRepository.findById(
      input.nominationId,
    );

    if (!nomination) {
      throw new NotFoundException("Nomination was not found.");
    }

    if (nomination.status !== NominationStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        "Only pending nominations can be confirmed.",
      );
    }

    return this.nominationsRepository.updateReview({
      nominationId: input.nominationId,
      status: "CONFIRMED",
      reviewedByUserId: input.reviewerUserId,
      rejectionReason: null,
    });
  }
}
