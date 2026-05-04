import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { CONTESTANTS_REPOSITORY } from "../../../contestants/application/contestants.tokens";
import { ContestantsRepository } from "../../../contestants/application/ports/contestants.repository";
import { ProvisionContestantAccountUseCase } from "../../../contestants/application/use-cases/provision-contestant-account.use-case";
import { extractEventInitials } from "../../../contestants/domain/build-contestant-code";
import { Nomination } from "../../domain/nomination";
import { NominationStatus } from "../../domain/nomination-status";
import { NOMINATIONS_REPOSITORY } from "../nominations.tokens";
import { NominationsRepository } from "../ports/nominations.repository";

@Injectable()
export class ConfirmNominationUseCase {
  constructor(
    @Inject(NOMINATIONS_REPOSITORY)
    private readonly nominationsRepository: NominationsRepository,
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
    private readonly provisionContestantAccountUseCase: ProvisionContestantAccountUseCase,
  ) {}

  async execute(input: {
    nominationId: string;
    reviewerUserId: string;
    nomineeEmail?: string;
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

    const nomineeEmail =
      input.nomineeEmail?.trim().toLowerCase() ?? nomination.nomineeEmail;

    if (!nomineeEmail) {
      throw new BadRequestException(
        "A nominee email address is required before confirmation.",
      );
    }

    const event = await this.eventsRepository.findById(nomination.eventId);

    if (!event) {
      throw new NotFoundException("Event was not found.");
    }

    const confirmed = await this.nominationsRepository.updateReview({
      nominationId: input.nominationId,
      status: "CONFIRMED",
      reviewedByUserId: input.reviewerUserId,
      rejectionReason: null,
      nomineeEmail,
    });

    const contestant = await this.contestantsRepository.createFromNomination({
      eventId: nomination.eventId,
      categoryId: nomination.categoryId,
      nominationId: nomination.id,
      codePrefix: extractEventInitials(event.name),
      name: nomination.nomineeName,
      email: nomineeEmail,
      phone: nomination.nomineePhone,
      imageUrl: nomination.nomineeImageUrl,
      imageKey: nomination.nomineeImageKey,
    });

    await this.provisionContestantAccountUseCase.execute({
      contestantId: contestant.id,
      contestantCode: contestant.code,
      name: nomination.nomineeName,
      email: nomineeEmail,
      eventName: event.name,
    });

    return confirmed;
  }
}
