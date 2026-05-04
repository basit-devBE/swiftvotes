import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { AuthenticatedRequestUser } from "../../../auth/domain/authenticated-request-user";
import { CurrentUser } from "../../../auth/presentation/http/decorators/current-user.decorator";
import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { EventRole } from "../../../access-control/domain/event-role";
import { EventRoles } from "../../../access-control/presentation/http/decorators/event-roles.decorator";
import { ConfirmNominationUseCase } from "../../application/use-cases/confirm-nomination.use-case";
import { ListNominationsUseCase } from "../../application/use-cases/list-nominations.use-case";
import { RejectNominationUseCase } from "../../application/use-cases/reject-nomination.use-case";
import { SubmitNominationUseCase } from "../../application/use-cases/submit-nomination.use-case";
import { RejectNominationDto } from "./dto/reject-nomination.dto";
import { SubmitNominationDto } from "./dto/submit-nomination.dto";
import { NominationResponseDto } from "./responses/nomination.response.dto";

@Controller({
  path: "events/:eventId/nominations",
  version: "1",
})
export class NominationsController {
  constructor(
    private readonly submitNominationUseCase: SubmitNominationUseCase,
    private readonly listNominationsUseCase: ListNominationsUseCase,
    private readonly confirmNominationUseCase: ConfirmNominationUseCase,
    private readonly rejectNominationUseCase: RejectNominationUseCase,
  ) {}

  @Public()
  @Post()
  async submitNomination(
    @Param("eventId") eventId: string,
    @Body() body: SubmitNominationDto,
  ): Promise<NominationResponseDto> {
    const nomination = await this.submitNominationUseCase.execute({
      eventId,
      categoryId: body.categoryId,
      submitterName: body.submitterName,
      submitterEmail: body.submitterEmail,
      submitterPhone: body.submitterPhone,
      nomineeName: body.nomineeName,
      nomineeEmail: body.nomineeEmail,
      nomineePhone: body.nomineePhone,
      nomineeImageUrl: body.nomineeImageUrl,
      nomineeImageKey: body.nomineeImageKey,
    });

    return NominationResponseDto.fromDomain(nomination);
  }

  @Get()
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN, EventRole.MODERATOR)
  async listNominations(
    @Param("eventId") eventId: string,
  ): Promise<NominationResponseDto[]> {
    const nominations = await this.listNominationsUseCase.execute(eventId);
    return nominations.map((nomination) =>
      NominationResponseDto.fromDomain(nomination),
    );
  }

  @Post(":nominationId/confirm")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN, EventRole.MODERATOR)
  async confirmNomination(
    @Param("nominationId") nominationId: string,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ): Promise<NominationResponseDto> {
    const nomination = await this.confirmNominationUseCase.execute({
      nominationId,
      reviewerUserId: currentUser.id,
    });

    return NominationResponseDto.fromDomain(nomination);
  }

  @Post(":nominationId/reject")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN, EventRole.MODERATOR)
  async rejectNomination(
    @Param("nominationId") nominationId: string,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
    @Body() body: RejectNominationDto,
  ): Promise<NominationResponseDto> {
    const nomination = await this.rejectNominationUseCase.execute({
      nominationId,
      reviewerUserId: currentUser.id,
      reason: body.reason,
    });

    return NominationResponseDto.fromDomain(nomination);
  }
}
