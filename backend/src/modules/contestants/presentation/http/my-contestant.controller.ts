import { Controller, Get, Param } from "@nestjs/common";

import { CurrentUser } from "../../../auth/presentation/http/decorators/current-user.decorator";
import { AuthenticatedRequestUser } from "../../../auth/domain/authenticated-request-user";
import { GetMyContestantProfileUseCase } from "../../application/use-cases/get-my-contestant-profile.use-case";
import { GetMyContestantProfilesUseCase } from "../../application/use-cases/get-my-contestant-profiles.use-case";
import { MyContestantProfileResponseDto } from "./responses/my-contestant-profile.response.dto";
import { MyContestantSummaryResponseDto } from "./responses/my-contestant-summary.response.dto";

@Controller({ path: "contestants", version: "1" })
export class MyContestantController {
  constructor(
    private readonly getMyContestantProfilesUseCase: GetMyContestantProfilesUseCase,
    private readonly getMyContestantProfileUseCase: GetMyContestantProfileUseCase,
  ) {}

  @Get("me")
  async getMyProfiles(
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ): Promise<MyContestantSummaryResponseDto[]> {
    const profiles = await this.getMyContestantProfilesUseCase.execute(currentUser.id);
    return profiles.map((p) => MyContestantSummaryResponseDto.fromDomain(p));
  }

  @Get("me/:contestantId")
  async getMyProfile(
    @CurrentUser() currentUser: AuthenticatedRequestUser,
    @Param("contestantId") contestantId: string,
  ): Promise<MyContestantProfileResponseDto> {
    const profile = await this.getMyContestantProfileUseCase.execute(
      currentUser.id,
      contestantId,
    );
    return MyContestantProfileResponseDto.fromDomain(profile);
  }
}
