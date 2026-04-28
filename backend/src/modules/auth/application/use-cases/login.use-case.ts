import {
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import {
  PASSWORD_HASHER,
  PasswordHasher,
} from "../../../../core/security/password-hasher";
import { USERS_REPOSITORY } from "../../../users/application/users.tokens";
import { UsersRepository } from "../../../users/application/ports/users.repository";
import { UserStatus } from "../../../users/domain/user-status";
import { User } from "../../../users/domain/user";
import { AUTH_TOKEN_SERVICE } from "../auth.tokens";
import {
  AuthTokenService,
  SignedToken,
} from "../ports/auth-token.service";

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthSession = {
  accessToken: SignedToken;
  refreshToken: SignedToken;
  user: User;
};

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(input: LoginInput): Promise<AuthSession> {
    const user = await this.usersRepository.findByEmail(
      input.email.trim().toLowerCase(),
    );

    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Your account is not active.");
    }

    const passwordMatches = await this.passwordHasher.compare(
      input.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.authTokenService.issueAccessToken(user),
      this.authTokenService.issueRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }
}
