import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { CONTESTANTS_REPOSITORY } from "../../../contestants/application/contestants.tokens";
import { ContestantsRepository } from "../../../contestants/application/ports/contestants.repository";
import { EVENTS_REPOSITORY } from "../../../events/application/events.tokens";
import { EventsRepository } from "../../../events/application/ports/events.repository";
import { VOTES_REPOSITORY } from "../votes.tokens";
import { VotesRepository } from "../ports/votes.repository";

export type LeaderboardContestantEntry = {
  rank: number;
  id: string;
  code: string;
  name: string;
  imageUrl: string | null;
  voteCount: number;
};

export type LeaderboardCategory = {
  categoryId: string;
  categoryName: string;
  contestants: LeaderboardContestantEntry[];
};

@Injectable()
export class GetLeaderboardUseCase {
  constructor(
    @Inject(VOTES_REPOSITORY)
    private readonly votesRepository: VotesRepository,
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
  ) {}

  async execute(eventId: string): Promise<LeaderboardCategory[]> {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    const [contestants, voteCounts] = await Promise.all([
      this.contestantsRepository.findByEvent(eventId),
      this.votesRepository.countsByEvent(eventId),
    ]);

    const voteCountByContestant = new Map<string, number>();
    for (const row of voteCounts) {
      voteCountByContestant.set(row.contestantId, row.totalVotes);
    }

    return event.categories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((category) => {
        const entries = contestants
          .filter((c) => c.categoryId === category.id)
          .map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            imageUrl: c.imageUrl,
            voteCount: voteCountByContestant.get(c.id) ?? 0,
          }))
          .sort((a, b) => {
            if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
            return a.code.localeCompare(b.code);
          })
          .map((entry, index) => ({ rank: index + 1, ...entry }));

        return {
          categoryId: category.id,
          categoryName: category.name,
          contestants: entries,
        };
      });
  }
}
