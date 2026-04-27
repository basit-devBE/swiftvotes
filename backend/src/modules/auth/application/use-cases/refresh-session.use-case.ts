import {
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { USERS_REPOSITORY } from "../../../users/application/users.tokens";
import { UsersRepository } from "../../../users/application/ports/users.repository";
import { UserStatus } from "../../../users/domain/user-status";
import { User } from "../../../users/domain/user";
import { AUTH_TOKEN_SERVICE } from "../auth.tokens";
import {
  AuthTokenService,
  SignedToken,
} from "../ports/auth-token.service";

export type RefreshSessionResult = {
  accessToken: SignedToken;
  refreshToken: SignedToken;
  user: User;
};

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(refreshToken: string): Promise<RefreshSessionResult> {
    const payload =
      await this.authTokenService.verifyRefreshToken(refreshToken);
    const user = await this.usersRepository.findById(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Refresh token is no longer valid.");
    }

    const [accessTokenResult, refreshTokenResult] = await Promise.all([
      this.authTokenService.issueAccessToken(user),
      this.authTokenService.issueRefreshToken(user),
    ]);

    return {
      accessToken: accessTokenResult,
      refreshToken: refreshTokenResult,
      user,
    };
  }
}
