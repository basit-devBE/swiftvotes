import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { RedeemedIssuedTicket } from "../ports/ticketing.repository";
import { TICKETING_REPOSITORY } from "../ticketing.tokens";
import { TicketingRepository } from "../ports/ticketing.repository";

@Injectable()
export class RedeemIssuedTicketUseCase {
  constructor(
    @Inject(TICKETING_REPOSITORY)
    private readonly ticketingRepository: TicketingRepository,
  ) {}

  async execute(input: {
    eventId: string;
    code: string;
    checkedInById: string;
  }): Promise<RedeemedIssuedTicket> {
    const code = input.code.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException("Ticket code is required.");
    }

    try {
      return await this.ticketingRepository.redeemIssuedTicket({
        eventId: input.eventId,
        code,
        checkedInById: input.checkedInById,
      });
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      if (error.message === "Issued ticket was not found.") {
        throw new NotFoundException("Ticket was not found for this event.");
      }

      if (error.message === "Issued ticket has already been redeemed.") {
        throw new ConflictException("This ticket has already been redeemed.");
      }

      if (error.message === "Issued ticket is cancelled.") {
        throw new ConflictException("This ticket has been cancelled.");
      }

      throw error;
    }
  }
}
