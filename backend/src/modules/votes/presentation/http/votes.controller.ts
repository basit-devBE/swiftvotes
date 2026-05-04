import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { Request } from "express";

import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { CastVoteUseCase } from "../../application/use-cases/cast-vote.use-case";
import { ConfirmVoteUseCase } from "../../application/use-cases/confirm-vote.use-case";
import { GetLeaderboardUseCase } from "../../application/use-cases/get-leaderboard.use-case";
import { CastVoteDto } from "./dto/cast-vote.dto";
import { CastVoteResponseDto } from "./responses/cast-vote.response.dto";
import { LeaderboardCategoryDto } from "./responses/leaderboard.response.dto";
import { VerifyVoteResponseDto } from "./responses/verify-vote.response.dto";

@Controller({
  path: "events/:eventId",
  version: "1",
})
export class VotesController {
  constructor(
    private readonly castVoteUseCase: CastVoteUseCase,
    private readonly confirmVoteUseCase: ConfirmVoteUseCase,
    private readonly getLeaderboardUseCase: GetLeaderboardUseCase,
  ) {}

  @Public()
  @Post("votes")
  async castVote(
    @Param("eventId") eventId: string,
    @Body() body: CastVoteDto,
    @Req() request: Request,
  ): Promise<CastVoteResponseDto> {
    const result = await this.castVoteUseCase.execute({
      eventId,
      contestantId: body.contestantId,
      quantity: body.quantity,
      voterName: body.voterName,
      voterEmail: body.voterEmail,
      ipAddress: request.ip ?? null,
    });
    return CastVoteResponseDto.fromResult(result);
  }

  @Public()
  @Get("votes/verify")
  async verifyVote(
    @Param("eventId") eventId: string,
    @Query("reference") reference: string | undefined,
  ): Promise<VerifyVoteResponseDto> {
    if (!reference) {
      throw new BadRequestException("reference query param is required.");
    }
    const result = await this.confirmVoteUseCase.execute(reference);
    if (result.vote.eventId !== eventId) {
      throw new BadRequestException("Reference does not belong to this event.");
    }
    return VerifyVoteResponseDto.fromDomain(result.vote);
  }

  @Public()
  @Get("leaderboard")
  async getLeaderboard(
    @Param("eventId") eventId: string,
  ): Promise<LeaderboardCategoryDto[]> {
    const categories = await this.getLeaderboardUseCase.execute(eventId);
    return categories.map((c) => LeaderboardCategoryDto.fromDomain(c));
  }
}
