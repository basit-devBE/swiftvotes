import { Event } from "../../../domain/event";
import { EventCategoryResponseDto } from "./event-category.response.dto";

export class EventResponseDto {
  id!: string;
  creatorUserId!: string;
  name!: string;
  slug!: string;
  description!: string;
  status!: string;
  primaryFlyerUrl!: string;
  primaryFlyerKey!: string;
  bannerUrl!: string | null;
  bannerKey!: string | null;
  nominationStartAt!: Date | null;
  nominationEndAt!: Date | null;
  votingStartAt!: Date;
  votingEndAt!: Date;
  contestantsCanViewOwnVotes!: boolean;
  contestantsCanViewLeaderboard!: boolean;
  publicCanViewLeaderboard!: boolean;
  submittedAt!: Date | null;
  approvedAt!: Date | null;
  approvedByUserId!: string | null;
  rejectedAt!: Date | null;
  rejectedByUserId!: string | null;
  rejectionReason!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  categories!: EventCategoryResponseDto[];

  static fromDomain(event: Event): EventResponseDto {
    return {
      id: event.id,
      creatorUserId: event.creatorUserId,
      name: event.name,
      slug: event.slug,
      description: event.description,
      status: event.status,
      primaryFlyerUrl: event.primaryFlyerUrl,
      primaryFlyerKey: event.primaryFlyerKey,
      bannerUrl: event.bannerUrl,
      bannerKey: event.bannerKey,
      nominationStartAt: event.nominationStartAt,
      nominationEndAt: event.nominationEndAt,
      votingStartAt: event.votingStartAt,
      votingEndAt: event.votingEndAt,
      contestantsCanViewOwnVotes: event.contestantsCanViewOwnVotes,
      contestantsCanViewLeaderboard: event.contestantsCanViewLeaderboard,
      publicCanViewLeaderboard: event.publicCanViewLeaderboard,
      submittedAt: event.submittedAt,
      approvedAt: event.approvedAt,
      approvedByUserId: event.approvedByUserId,
      rejectedAt: event.rejectedAt,
      rejectedByUserId: event.rejectedByUserId,
      rejectionReason: event.rejectionReason,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      categories: event.categories.map((category) =>
        EventCategoryResponseDto.fromDomain(category),
      ),
    };
  }
}
