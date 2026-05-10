import { Body, Controller, Post } from "@nestjs/common";

import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { UssdHooksService } from "../../application/ussd-hooks.service";

@Public()
@Controller({ path: "ussd/hooks", version: "1" })
export class UssdHooksController {
  constructor(private readonly ussdHooks: UssdHooksService) {}

  @Post("contestant")
  resolveContestant(
    @Body() body: Record<string, unknown>,
  ): Promise<Record<string, string>> {
    return this.ussdHooks.resolveContestant(body);
  }

  @Post("quote")
  quote(@Body() body: Record<string, unknown>): Promise<Record<string, string>> {
    return this.ussdHooks.quote(body);
  }

  @Post("create-payment")
  createPayment(
    @Body() body: Record<string, unknown>,
  ): Promise<Record<string, string>> {
    return this.ussdHooks.createPayment(body);
  }

  @Post("payment-status")
  paymentStatus(
    @Body() body: Record<string, unknown>,
  ): Promise<Record<string, string>> {
    return this.ussdHooks.paymentStatus(body);
  }
}
