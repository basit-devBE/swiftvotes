import { Body, Controller, Post } from "@nestjs/common";

import { AuthenticatedRequestUser } from "../../../auth/domain/authenticated-request-user";
import { CurrentUser } from "../../../auth/presentation/http/decorators/current-user.decorator";
import { Public } from "../../../auth/presentation/http/decorators/public.decorator";
import { CreateUploadIntentUseCase } from "../../application/use-cases/create-upload-intent.use-case";
import { CreateUploadIntentDto } from "./dto/create-upload-intent.dto";
import { UploadIntentResponseDto } from "./responses/upload-intent.response.dto";

@Controller({
  path: "uploads",
  version: "1",
})
export class UploadsController {
  constructor(
    private readonly createUploadIntentUseCase: CreateUploadIntentUseCase,
  ) {}

  @Post("events/flyer-url")
  async createEventFlyerIntent(
    @CurrentUser() currentUser: AuthenticatedRequestUser,
    @Body() body: CreateUploadIntentDto,
  ): Promise<UploadIntentResponseDto> {
    const result = await this.createUploadIntentUseCase.execute({
      ownerId: currentUser.id,
      kind: "event-flyer",
      fileName: body.fileName,
      contentType: body.contentType,
      eventId: body.eventId,
    });

    return UploadIntentResponseDto.fromResult(result);
  }

  @Post("events/banner-url")
  async createEventBannerIntent(
    @CurrentUser() currentUser: AuthenticatedRequestUser,
    @Body() body: CreateUploadIntentDto,
  ): Promise<UploadIntentResponseDto> {
    const result = await this.createUploadIntentUseCase.execute({
      ownerId: currentUser.id,
      kind: "event-banner",
      fileName: body.fileName,
      contentType: body.contentType,
      eventId: body.eventId,
    });

    return UploadIntentResponseDto.fromResult(result);
  }

  @Post("categories/image-url")
  async createCategoryImageIntent(
    @CurrentUser() currentUser: AuthenticatedRequestUser,
    @Body() body: CreateUploadIntentDto,
  ): Promise<UploadIntentResponseDto> {
    const result = await this.createUploadIntentUseCase.execute({
      ownerId: currentUser.id,
      kind: "category-image",
      fileName: body.fileName,
      contentType: body.contentType,
      eventId: body.eventId,
      categoryId: body.categoryId,
    });

    return UploadIntentResponseDto.fromResult(result);
  }

  @Public()
  @Post("nominations/image-url")
  async createNominationImageIntent(
    @Body() body: CreateUploadIntentDto,
  ): Promise<UploadIntentResponseDto> {
    const result = await this.createUploadIntentUseCase.execute({
      ownerId: "public",
      kind: "nomination-image",
      fileName: body.fileName,
      contentType: body.contentType,
      eventId: body.eventId,
      nominationId: body.nominationId,
    });

    return UploadIntentResponseDto.fromResult(result);
  }
}
