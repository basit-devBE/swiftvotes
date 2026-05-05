import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";

import { CurrentUser } from "../../../auth/presentation/http/decorators/current-user.decorator";
import { SystemRoles } from "../../../auth/presentation/http/decorators/system-roles.decorator";
import { AuthenticatedRequestUser } from "../../../auth/domain/authenticated-request-user";
import { EventRole } from "../../../access-control/domain/event-role";
import { EventRoles } from "../../../access-control/presentation/http/decorators/event-roles.decorator";
import { SystemRole } from "../../../users/domain/system-role";
import { ApproveEventUseCase } from "../../application/use-cases/approve-event.use-case";
import { CreateCategoryUseCase } from "../../application/use-cases/create-category.use-case";
import { CreateEventUseCase } from "../../application/use-cases/create-event.use-case";
import { ListAllEventsUseCase } from "../../application/use-cases/list-all-events.use-case";
import { ListApprovedEventsUseCase } from "../../application/use-cases/list-approved-events.use-case";
import { DeleteCategoryUseCase } from "../../application/use-cases/delete-category.use-case";
import { GetEventDetailsUseCase } from "../../application/use-cases/get-event-details.use-case";
import { ListMyEventsUseCase } from "../../application/use-cases/list-my-events.use-case";
import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { ListPendingEventsUseCase } from "../../application/use-cases/list-pending-events.use-case";
import { RejectEventUseCase } from "../../application/use-cases/reject-event.use-case";
import { ResubmitEventUseCase } from "../../application/use-cases/resubmit-event.use-case";
import { SubmitEventUseCase } from "../../application/use-cases/submit-event.use-case";
import { UpdateCategoryUseCase } from "../../application/use-cases/update-category.use-case";
import { UpdateEventUseCase } from "../../application/use-cases/update-event.use-case";
import { UpdateEventVisibilityUseCase } from "../../application/use-cases/update-event-visibility.use-case";
import { CreateEventCategoryDto } from "./dto/create-event-category.dto";
import { CreateEventDto } from "./dto/create-event.dto";
import { RejectEventDto } from "./dto/reject-event.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { UpdateEventVisibilityDto } from "./dto/update-event-visibility.dto";
import { EventCategoryResponseDto } from "./responses/event-category.response.dto";
import { EventResponseDto } from "./responses/event.response.dto";

@Controller({
  path: "events",
  version: "1",
})
export class EventsController {
  constructor(
    private readonly createEventUseCase: CreateEventUseCase,
    private readonly listAllEventsUseCase: ListAllEventsUseCase,
    private readonly listApprovedEventsUseCase: ListApprovedEventsUseCase,
    private readonly listMyEventsUseCase: ListMyEventsUseCase,
    private readonly getEventDetailsUseCase: GetEventDetailsUseCase,
    private readonly updateEventUseCase: UpdateEventUseCase,
    private readonly submitEventUseCase: SubmitEventUseCase,
    private readonly resubmitEventUseCase: ResubmitEventUseCase,
    private readonly listPendingEventsUseCase: ListPendingEventsUseCase,
    private readonly approveEventUseCase: ApproveEventUseCase,
    private readonly rejectEventUseCase: RejectEventUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly updateEventVisibilityUseCase: UpdateEventVisibilityUseCase,
  ) {}

  @Public()
  @Get()
  async listApproved(): Promise<EventResponseDto[]> {
    const events = await this.listApprovedEventsUseCase.execute();
    return events.map((event) => EventResponseDto.fromDomain(event));
  }

  @Post()
  async createEvent(
    @CurrentUser() currentUser: AuthenticatedRequestUser,
    @Body() body: CreateEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.createEventUseCase.execute({
      creatorUserId: currentUser.id,
      name: body.name,
      description: body.description,
      primaryFlyerUrl: body.primaryFlyerUrl,
      primaryFlyerKey: body.primaryFlyerKey,
      bannerUrl: body.bannerUrl,
      bannerKey: body.bannerKey,
      nominationStartAt: body.nominationStartAt
        ? new Date(body.nominationStartAt)
        : null,
      nominationEndAt: body.nominationEndAt
        ? new Date(body.nominationEndAt)
        : null,
      votingStartAt: new Date(body.votingStartAt),
      votingEndAt: new Date(body.votingEndAt),
      contestantsCanViewOwnVotes: body.contestantsCanViewOwnVotes ?? false,
      contestantsCanViewLeaderboard: body.contestantsCanViewLeaderboard ?? false,
      publicCanViewLeaderboard: body.publicCanViewLeaderboard ?? true,
      categories: body.categories.map((category) => ({
        ...category,
        currency: category.currency.trim().toUpperCase(),
      })),
    });

    return EventResponseDto.fromDomain(event);
  }

  @Get("mine")
  async listMine(
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ): Promise<EventResponseDto[]> {
    const events = await this.listMyEventsUseCase.execute(currentUser.id);
    return events.map((event) => EventResponseDto.fromDomain(event));
  }

  @Get("admin/pending")
  @SystemRoles(SystemRole.SUPER_ADMIN)
  async listPendingEvents(): Promise<EventResponseDto[]> {
    const events = await this.listPendingEventsUseCase.execute();
    return events.map((event) => EventResponseDto.fromDomain(event));
  }

  @Get("admin/all")
  @SystemRoles(SystemRole.SUPER_ADMIN)
  async listAllEvents(): Promise<EventResponseDto[]> {
    const events = await this.listAllEventsUseCase.execute();
    return events.map((event) => EventResponseDto.fromDomain(event));
  }

  @Post("admin/:eventId/approve")
  @SystemRoles(SystemRole.SUPER_ADMIN)
  async approveEvent(
    @Param("eventId") eventId: string,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ): Promise<EventResponseDto> {
    const event = await this.approveEventUseCase.execute({
      eventId,
      reviewerUserId: currentUser.id,
    });

    return EventResponseDto.fromDomain(event);
  }

  @Post("admin/:eventId/reject")
  @SystemRoles(SystemRole.SUPER_ADMIN)
  async rejectEvent(
    @Param("eventId") eventId: string,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
    @Body() body: RejectEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.rejectEventUseCase.execute({
      eventId,
      reviewerUserId: currentUser.id,
      reason: body.reason,
    });

    return EventResponseDto.fromDomain(event);
  }

  @Public()
  @Get(":eventId")
  async getEvent(@Param("eventId") eventId: string): Promise<EventResponseDto> {
    const event = await this.getEventDetailsUseCase.execute(eventId);
    return EventResponseDto.fromDomain(event);
  }

  @Patch(":eventId")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async updateEvent(
    @Param("eventId") eventId: string,
    @Body() body: UpdateEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.updateEventUseCase.execute({
      eventId,
      name: body.name,
      description: body.description,
      primaryFlyerUrl: body.primaryFlyerUrl,
      primaryFlyerKey: body.primaryFlyerKey,
      bannerUrl: body.bannerUrl,
      bannerKey: body.bannerKey,
      nominationStartAt: body.nominationStartAt
        ? new Date(body.nominationStartAt)
        : body.nominationStartAt === null
          ? null
          : undefined,
      nominationEndAt: body.nominationEndAt
        ? new Date(body.nominationEndAt)
        : body.nominationEndAt === null
          ? null
          : undefined,
      votingStartAt: body.votingStartAt
        ? new Date(body.votingStartAt)
        : undefined,
      votingEndAt: body.votingEndAt ? new Date(body.votingEndAt) : undefined,
      contestantsCanViewOwnVotes: body.contestantsCanViewOwnVotes,
      contestantsCanViewLeaderboard: body.contestantsCanViewLeaderboard,
      publicCanViewLeaderboard: body.publicCanViewLeaderboard,
    });

    return EventResponseDto.fromDomain(event);
  }

  @Patch(":eventId/visibility")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async updateEventVisibility(
    @Param("eventId") eventId: string,
    @Body() body: UpdateEventVisibilityDto,
  ): Promise<EventResponseDto> {
    const event = await this.updateEventVisibilityUseCase.execute({
      eventId,
      contestantsCanViewOwnVotes: body.contestantsCanViewOwnVotes,
      contestantsCanViewLeaderboard: body.contestantsCanViewLeaderboard,
      publicCanViewLeaderboard: body.publicCanViewLeaderboard,
    });
    return EventResponseDto.fromDomain(event);
  }

  @Post(":eventId/submit")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async submitEvent(
    @Param("eventId") eventId: string,
  ): Promise<EventResponseDto> {
    const event = await this.submitEventUseCase.execute(eventId);
    return EventResponseDto.fromDomain(event);
  }

  @Post(":eventId/resubmit")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async resubmitEvent(
    @Param("eventId") eventId: string,
  ): Promise<EventResponseDto> {
    const event = await this.resubmitEventUseCase.execute(eventId);
    return EventResponseDto.fromDomain(event);
  }

  @Post(":eventId/categories")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async createCategory(
    @Param("eventId") eventId: string,
    @Body() body: CreateEventCategoryDto,
  ): Promise<EventCategoryResponseDto> {
    const category = await this.createCategoryUseCase.execute({
      eventId,
      ...body,
      currency: body.currency.trim().toUpperCase(),
    });

    return EventCategoryResponseDto.fromDomain(category);
  }

  @Patch(":eventId/categories/:categoryId")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async updateCategory(
    @Param("categoryId") categoryId: string,
    @Body() body: UpdateCategoryDto,
  ): Promise<EventCategoryResponseDto> {
    const category = await this.updateCategoryUseCase.execute({
      categoryId,
      ...body,
      currency: body.currency?.trim().toUpperCase(),
    });

    return EventCategoryResponseDto.fromDomain(category);
  }

  @Delete(":eventId/categories/:categoryId")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async deleteCategory(@Param("categoryId") categoryId: string): Promise<void> {
    await this.deleteCategoryUseCase.execute(categoryId);
  }
}
