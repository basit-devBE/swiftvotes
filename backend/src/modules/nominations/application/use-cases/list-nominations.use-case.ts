import { Inject, Injectable } from "@nestjs/common";

import { NOMINATIONS_REPOSITORY } from "../nominations.tokens";
import { NominationsRepository } from "../ports/nominations.repository";
import { Nomination } from "../../domain/nomination";

@Injectable()
export class ListNominationsUseCase {
  constructor(
    @Inject(NOMINATIONS_REPOSITORY)
    private readonly nominationsRepository: NominationsRepository,
  ) {}

  execute(eventId: string): Promise<Nomination[]> {
    return this.nominationsRepository.findByEvent(eventId);
  }
}
