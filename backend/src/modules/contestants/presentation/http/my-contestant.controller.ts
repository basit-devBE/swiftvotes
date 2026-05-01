import { Controller, Get } from "@nestjs/common";

import { CurrentUser } from "../../../auth/presentation/http/decorators/current-user.decorator";
import { AuthenticatedRequestUser } from "../../../auth/domain/authenticated-request-user";
import { GetMyContestantProfilesUseCase } from "../../application/use-cases/get-my-contestant-profiles.use-case";
import { MyContestantProfileResponseDto } from "./responses/my-contestant-profile.response.dto";

@Controller({ path: "contestants", version: "1" })
export class MyContestantController {
  constructor(
    private readonly getMyContestantProfilesUseCase: GetMyContestantProfilesUseCase,
  ) {}

  @Get("me")
  async getMyProfiles(
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ): Promise<MyContestantProfileResponseDto[]> {
    const profiles = await this.getMyContestantProfilesUseCase.execute(currentUser.id);
    return profiles.map((p) => MyContestantProfileResponseDto.fromDomain(p));
  }
}
