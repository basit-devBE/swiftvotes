import { LeaderboardCategory } from "../../../application/use-cases/get-leaderboard.use-case";

export class LeaderboardEntryDto {
  rank!: number;
  id!: string;
  code!: string;
  name!: string;
  imageUrl!: string | null;
  voteCount!: number;
}

export class LeaderboardCategoryDto {
  categoryId!: string;
  categoryName!: string;
  contestants!: LeaderboardEntryDto[];

  static fromDomain(category: LeaderboardCategory): LeaderboardCategoryDto {
    return {
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      contestants: category.contestants,
    };
  }
}
