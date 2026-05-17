import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { Request } from "express";

import { EventRole } from "../../../access-control/domain/event-role";
import { EventRoles } from "../../../access-control/presentation/http/decorators/event-roles.decorator";
import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { ConfirmTicketOrderUseCase } from "../../application/use-cases/confirm-ticket-order.use-case";
import { CreateTicketOrderUseCase } from "../../application/use-cases/create-ticket-order.use-case";
import { CreateTicketTypeUseCase } from "../../application/use-cases/create-ticket-type.use-case";
import { DisableTicketTypeUseCase } from "../../application/use-cases/disable-ticket-type.use-case";
import { ListTicketTypesUseCase } from "../../application/use-cases/list-ticket-types.use-case";
import { UpdateTicketTypeUseCase } from "../../application/use-cases/update-ticket-type.use-case";
import { CreateTicketOrderDto } from "./dto/create-ticket-order.dto";
import { CreateTicketTypeDto } from "./dto/create-ticket-type.dto";
import { UpdateTicketTypeDto } from "./dto/update-ticket-type.dto";
import {
  CreateTicketOrderResponseDto,
  TicketOrderResponseDto,
} from "./responses/ticket-order.response.dto";
import { TicketTypeResponseDto } from "./responses/ticket-type.response.dto";

@Controller({
  path: "events/:eventId",
  version: "1",
})
export class TicketingController {
  constructor(
    private readonly createTicketTypeUseCase: CreateTicketTypeUseCase,
    private readonly updateTicketTypeUseCase: UpdateTicketTypeUseCase,
    private readonly disableTicketTypeUseCase: DisableTicketTypeUseCase,
    private readonly listTicketTypesUseCase: ListTicketTypesUseCase,
    private readonly createTicketOrderUseCase: CreateTicketOrderUseCase,
    private readonly confirmTicketOrderUseCase: ConfirmTicketOrderUseCase,
  ) {}

  @Public()
  @Get("ticket-types")
  async listTicketTypes(
    @Param("eventId") eventId: string,
  ): Promise<TicketTypeResponseDto[]> {
    const ticketTypes = await this.listTicketTypesUseCase.execute(eventId);
    return ticketTypes.map((ticketType) =>
      TicketTypeResponseDto.fromDomain(ticketType),
    );
  }

  @Post("ticket-types")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async createTicketType(
    @Param("eventId") eventId: string,
    @Body() body: CreateTicketTypeDto,
  ): Promise<TicketTypeResponseDto> {
    const ticketType = await this.createTicketTypeUseCase.execute({
      eventId,
      name: body.name,
      description: body.description,
      priceMinor: body.priceMinor,
      currency: body.currency,
      quantityAvailable: body.quantityAvailable,
      salesStartAt: body.salesStartAt ? new Date(body.salesStartAt) : null,
      salesEndAt: body.salesEndAt ? new Date(body.salesEndAt) : null,
      sortOrder: body.sortOrder,
    });
    return TicketTypeResponseDto.fromDomain(ticketType);
  }

  @Patch("ticket-types/:ticketTypeId")
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async updateTicketType(
    @Param("eventId") eventId: string,
    @Param("ticketTypeId") ticketTypeId: string,
    @Body() body: UpdateTicketTypeDto,
  ): Promise<TicketTypeResponseDto> {
    const ticketType = await this.updateTicketTypeUseCase.execute({
      eventId,
      ticketTypeId,
      name: body.name,
      description: body.description,
      priceMinor: body.priceMinor,
      currency: body.currency,
      quantityAvailable: body.quantityAvailable,
      salesStartAt: body.salesStartAt
        ? new Date(body.salesStartAt)
        : body.salesStartAt === null
          ? null
          : undefined,
      salesEndAt: body.salesEndAt
        ? new Date(body.salesEndAt)
        : body.salesEndAt === null
          ? null
          : undefined,
      isActive: body.isActive,
      sortOrder: body.sortOrder,
    });
    return TicketTypeResponseDto.fromDomain(ticketType);
  }

  @Delete("ticket-types/:ticketTypeId")
  @HttpCode(204)
  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  async disableTicketType(
    @Param("eventId") eventId: string,
    @Param("ticketTypeId") ticketTypeId: string,
  ): Promise<void> {
    await this.disableTicketTypeUseCase.execute({ eventId, ticketTypeId });
  }

  @Public()
  @Post("ticket-orders")
  async createTicketOrder(
    @Param("eventId") eventId: string,
    @Body() body: CreateTicketOrderDto,
    @Req() request: Request,
  ): Promise<CreateTicketOrderResponseDto> {
    const result = await this.createTicketOrderUseCase.execute({
      eventId,
      items: body.items,
      buyerName: body.buyerName,
      buyerEmail: body.buyerEmail,
      buyerPhone: body.buyerPhone,
      callbackOrigin: body.callbackOrigin,
      ipAddress: request.ip ?? null,
    });
    return CreateTicketOrderResponseDto.fromResult(result);
  }

  @Public()
  @Get("ticket-orders/verify")
  async verifyTicketOrder(
    @Param("eventId") eventId: string,
    @Query("reference") reference: string | undefined,
  ): Promise<TicketOrderResponseDto> {
    if (!reference) {
      throw new BadRequestException("reference query param is required.");
    }
    const order = await this.confirmTicketOrderUseCase.execute(reference);
    if (order.eventId !== eventId) {
      throw new BadRequestException("Reference does not belong to this event.");
    }
    return TicketOrderResponseDto.fromDomain(order);
  }
}
