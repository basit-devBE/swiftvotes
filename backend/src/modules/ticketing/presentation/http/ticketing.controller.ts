import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { Request } from "express";
import QRCode from "qrcode";

import { EventRole } from "../../../access-control/domain/event-role";
import { EventRoles } from "../../../access-control/presentation/http/decorators/event-roles.decorator";
import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { CurrentUser } from "../../../auth/presentation/http/decorators/current-user.decorator";
import { AuthenticatedRequestUser } from "../../../auth/domain/authenticated-request-user";
import { appConfig } from "../../../../core/config/app.config";
import { ConfirmTicketOrderUseCase } from "../../application/use-cases/confirm-ticket-order.use-case";
import { CreateTicketOrderUseCase } from "../../application/use-cases/create-ticket-order.use-case";
import { CreateTicketTypeUseCase } from "../../application/use-cases/create-ticket-type.use-case";
import { DisableTicketTypeUseCase } from "../../application/use-cases/disable-ticket-type.use-case";
import { ListTicketTypesUseCase } from "../../application/use-cases/list-ticket-types.use-case";
import { RedeemIssuedTicketUseCase } from "../../application/use-cases/redeem-issued-ticket.use-case";
import { UpdateTicketTypeUseCase } from "../../application/use-cases/update-ticket-type.use-case";
import { CreateTicketOrderDto } from "./dto/create-ticket-order.dto";
import { CreateTicketTypeDto } from "./dto/create-ticket-type.dto";
import { RedeemIssuedTicketDto } from "./dto/redeem-issued-ticket.dto";
import { UpdateTicketTypeDto } from "./dto/update-ticket-type.dto";
import { RedeemedIssuedTicketResponseDto } from "./responses/redeemed-issued-ticket.response.dto";
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
    private readonly redeemIssuedTicketUseCase: RedeemIssuedTicketUseCase,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
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
      momoProvider: body.momoProvider,
      phoneVerificationChallengeId: body.phoneVerificationChallengeId,
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

  @EventRoles(EventRole.EVENT_OWNER, EventRole.EVENT_ADMIN)
  @Post("issued-tickets/redeem")
  async redeemIssuedTicket(
    @Param("eventId") eventId: string,
    @Body() body: RedeemIssuedTicketDto,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ): Promise<RedeemedIssuedTicketResponseDto> {
    const ticket = await this.redeemIssuedTicketUseCase.execute({
      eventId,
      code: body.code,
      checkedInById: currentUser.id,
    });
    return RedeemedIssuedTicketResponseDto.fromDomain(ticket);
  }

  @Public()
  @Get("issued-tickets/qr")
  async getIssuedTicketQr(
    @Param("eventId") eventId: string,
    @Query("code") code: string | undefined,
  ): Promise<StreamableFile> {
    if (!code) {
      throw new BadRequestException("code query param is required.");
    }

    const redeemUrl = `${this.app.frontendOrigin}/events/${eventId}/tickets/redeem?code=${encodeURIComponent(code.trim().toUpperCase())}`;
    const buffer = await QRCode.toBuffer(redeemUrl, {
      type: "png",
      margin: 1,
      color: {
        dark: "#07111f",
        light: "#ffffff",
      },
      width: 256,
    });
    return new StreamableFile(buffer, { type: "image/png" });
  }
}
