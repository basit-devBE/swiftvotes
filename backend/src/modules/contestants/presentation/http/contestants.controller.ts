import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { EventRole } from "../../../access-control/domain/event-role";
import { EventRoles } from "../../../access-control/presentation/http/decorators/event-roles.decorator";
import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { GetContestantCredentialsUseCase } from "../../application/use-cases/get-contestant-credentials.use-case";
import { GetContestantUseCase } from "../../application/use-cases/get-contestant.use-case";
import { ListContestantsUseCase } from "../../application/use-cases/list-contestants.use-case";
import { RegenerateMagicLinkUseCase } from "../../application/use-cases/regenerate-magic-link.use-case";
import { UpdateContestantUseCase } from "../../application/use-cases/update-contestant.use-case";
import { UpdateContestantDto } from "./dto/update-contestant.dto";
import { ContestantResponseDto } from "./responses/contestant.response.dto";

@Controller({
  path: "events/:eventId/contestants",
  version: "1",
})
export class ContestantsController {
  constructor(
    private readonly listContestantsUseCase: ListContestantsUseCase,
    private readonly getContestantUseCase: GetContestantUseCase,
    private readonly getContestantCredentialsUseCase: GetContestantCredentialsUseCase,
    private readonly regenerateMagicLinkUseCase: RegenerateMagicLinkUseCase,
    private readonly updateContestantUseCase: UpdateContestantUseCase,
  ) {}

  @Public()
  @Get()
  async listContestants(
    @Param("eventId") eventId: string,
    @Query("categoryId") categoryId?: string,
  ): Promise<ContestantResponseDto[]> {
    const contestants = await this.listContestantsUseCase.execute(eventId, categoryId);
    return contestants.map((c) => ContestantResponseDto.fromDomain(c));
  }

  @Public()
  @Get(":contestantId")
  async getContestant(
    @Param("contestantId") contestantId: string,
  ): Promise<ContestantResponseDto> {
    const contestant = await this.getContestantUseCase.execute(contestantId);
    return ContestantResponseDto.fromDomain(contestant);
  }

  @Patch(":contestantId")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async updateContestant(
    @Param("eventId") eventId: string,
    @Param("contestantId") contestantId: string,
    @Body() body: UpdateContestantDto,
  ): Promise<ContestantResponseDto> {
    const contestant = await this.updateContestantUseCase.execute({
      eventId,
      contestantId,
      categoryId: body.categoryId,
      name: body.name,
      phone: body.phone,
      imageUrl: body.imageUrl,
      imageKey: body.imageKey,
    });

    return ContestantResponseDto.fromDomain(contestant);
  }

  @Get(":contestantId/credentials")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async getCredentials(
    @Param("contestantId") contestantId: string,
  ): Promise<{ email: string | null; hasAccount: boolean; magicLinkUrl: string | null }> {
    return this.getContestantCredentialsUseCase.execute(contestantId);
  }

  @Post(":contestantId/magic-link")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async regenerateMagicLink(
    @Param("contestantId") contestantId: string,
  ): Promise<{ magicLinkUrl: string }> {
    return this.regenerateMagicLinkUseCase.execute(contestantId);
  }
}
