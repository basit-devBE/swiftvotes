import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import { Request } from "express";

import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { HandleTicketPaymentWebhookUseCase } from "../../application/use-cases/handle-ticket-payment-webhook.use-case";

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller({ path: "ticket-payments", version: "1" })
export class TicketPaymentWebhooksController {
  constructor(
    private readonly handleWebhook: HandleTicketPaymentWebhookUseCase,
  ) {}

  @Public()
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async paystack(
    @Req() request: RawBodyRequest,
    @Headers("x-paystack-signature") signature: string | undefined,
  ): Promise<{ received: true }> {
    const rawBody = request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
    await this.handleWebhook.execute({ rawBody, signature });
    return { received: true };
  }
}
