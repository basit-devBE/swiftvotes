import { Body, Controller, Post } from "@nestjs/common";

import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { ConfirmPhoneVerificationUseCase } from "../../application/use-cases/confirm-phone-verification.use-case";
import { StartPhoneVerificationUseCase } from "../../application/use-cases/start-phone-verification.use-case";
import { ConfirmPhoneVerificationDto } from "./dto/confirm-phone-verification.dto";
import { StartPhoneVerificationDto } from "./dto/start-phone-verification.dto";
import {
  ConfirmPhoneVerificationResponseDto,
  StartPhoneVerificationResponseDto,
} from "./responses/phone-verification.response.dto";

@Controller({
  path: "phone-verifications",
  version: "1",
})
export class PhoneVerificationsController {
  constructor(
    private readonly startPhoneVerificationUseCase: StartPhoneVerificationUseCase,
    private readonly confirmPhoneVerificationUseCase: ConfirmPhoneVerificationUseCase,
  ) {}

  @Public()
  @Post("start")
  async start(
    @Body() body: StartPhoneVerificationDto,
  ): Promise<StartPhoneVerificationResponseDto> {
    const result = await this.startPhoneVerificationUseCase.execute({
      phone: body.phone,
      purpose: body.purpose,
    });
    return StartPhoneVerificationResponseDto.fromResult(result);
  }

  @Public()
  @Post("confirm")
  async confirm(
    @Body() body: ConfirmPhoneVerificationDto,
  ): Promise<ConfirmPhoneVerificationResponseDto> {
    const result = await this.confirmPhoneVerificationUseCase.execute({
      challengeId: body.challengeId,
      code: body.code,
      purpose: body.purpose,
    });
    return ConfirmPhoneVerificationResponseDto.fromResult(result);
  }
}
