import { ContestantWithContext } from "../../../application/ports/contestants.repository";

class EventSummaryDto {
  id!: string;
  name!: string;
  slug!: string;
  status!: string;
  contestantsCanViewOwnVotes!: boolean;
  contestantsCanViewLeaderboard!: boolean;
  votingStartAt!: string;
  votingEndAt!: string;
  primaryFlyerUrl!: string;
  bannerUrl!: string | null;
}

class CategorySummaryDto {
  id!: string;
  name!: string;
}

export class MyContestantProfileResponseDto {
  id!: string;
  code!: string;
  name!: string;
  imageUrl!: string | null;
  email!: string | null;
  voteCount!: number;
  createdAt!: string;
  event!: EventSummaryDto;
  category!: CategorySummaryDto;

  static fromDomain(profile: ContestantWithContext): MyContestantProfileResponseDto {
    return {
      id: profile.id,
      code: profile.code,
      name: profile.name,
      imageUrl: profile.imageUrl,
      email: profile.email,
      voteCount: 0,
      createdAt: profile.createdAt.toISOString(),
      event: {
        id: profile.event.id,
        name: profile.event.name,
        slug: profile.event.slug,
        status: profile.event.status,
        contestantsCanViewOwnVotes: profile.event.contestantsCanViewOwnVotes,
        contestantsCanViewLeaderboard: profile.event.contestantsCanViewLeaderboard,
        votingStartAt: profile.event.votingStartAt.toISOString(),
        votingEndAt: profile.event.votingEndAt.toISOString(),
        primaryFlyerUrl: profile.event.primaryFlyerUrl,
        bannerUrl: profile.event.bannerUrl,
      },
      category: {
        id: profile.category.id,
        name: profile.category.name,
      },
    };
  }
}
