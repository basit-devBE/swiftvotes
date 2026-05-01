import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import { USERS_REPOSITORY } from "../../../users/application/users.tokens";
import { UsersRepository } from "../../../users/application/ports/users.repository";
import { UserStatus } from "../../../users/domain/user-status";
import { User } from "../../../users/domain/user";
import { AUTH_TOKEN_SERVICE } from "../auth.tokens";
import { AuthTokenService, SignedToken } from "../ports/auth-token.service";
import { MAGIC_LINK_TOKENS_REPOSITORY, MagicLinkTokensRepository } from "../ports/magic-link-tokens.repository";

export type MagicLinkAuthSession = {
  accessToken: SignedToken;
  refreshToken: SignedToken;
  user: User;
};

@Injectable()
export class MagicLinkLoginUseCase {
  constructor(
    @Inject(MAGIC_LINK_TOKENS_REPOSITORY)
    private readonly magicLinkTokensRepository: MagicLinkTokensRepository,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(token: string): Promise<MagicLinkAuthSession> {
    const record = await this.magicLinkTokensRepository.findByToken(token);

    if (!record) {
      throw new UnauthorizedException("Invalid or expired magic link.");
    }

    if (record.usedAt !== null) {
      throw new UnauthorizedException("This magic link has already been used.");
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException("This magic link has expired.");
    }

    await this.magicLinkTokensRepository.markUsed(record.id);

    const user = await this.usersRepository.findById(record.userId);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Account is not available.");
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.authTokenService.issueAccessToken(user),
      this.authTokenService.issueRefreshToken(user),
    ]);

    return { accessToken, refreshToken, user };
  }
}
