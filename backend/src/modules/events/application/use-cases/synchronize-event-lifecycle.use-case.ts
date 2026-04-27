import { Inject, Injectable } from "@nestjs/common";

import { EventStatus } from "../../domain/event-status";
import { EVENTS_REPOSITORY } from "../events.tokens";
import { EventsRepository } from "../ports/events.repository";
import { determineEventStatusForTimestamp } from "../../domain/event-lifecycle";

@Injectable()
export class SynchronizeEventLifecycleUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(now = new Date()): Promise<number> {
    const candidates = await this.eventsRepository.findLifecycleCandidates();
    let updatedCount = 0;

    for (const event of candidates) {
      if (!event.approvedAt) {
        continue;
      }

      const targetStatus = determineEventStatusForTimestamp(event, now);

      if (event.status === EventStatus.VOTING_LIVE && targetStatus === EventStatus.VOTING_LIVE) {
        continue;
      }

      if (event.status === targetStatus) {
        continue;
      }

      if (event.status === EventStatus.NOMINATIONS_OPEN &&
          [EventStatus.VOTING_LIVE, EventStatus.VOTING_SCHEDULED].includes(targetStatus)) {
        await this.eventsRepository.updateStatus({
          eventId: event.id,
          status:
            targetStatus === EventStatus.VOTING_LIVE
              ? EventStatus.VOTING_LIVE
              : EventStatus.VOTING_SCHEDULED,
        });
        updatedCount += 1;
        continue;
      }

      await this.eventsRepository.updateStatus({
        eventId: event.id,
        status: targetStatus,
      });
      updatedCount += 1;
    }

    return updatedCount;
  }
}
