import {
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { authConfig } from "../../../../core/config/auth.config";
import { User } from "../../../users/domain/user";
import { AccessTokenPayload } from "../../domain/access-token-payload";
import { RefreshTokenPayload } from "../../domain/refresh-token-payload";
import {
  AuthTokenService,
  SignedToken,
} from "../../application/ports/auth-token.service";

@Injectable()
export class JwtTokenService implements AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  issueAccessToken(user: User): Promise<SignedToken> {
    return this.signToken<AccessTokenPayload>(
      {
        sub: user.id,
        email: user.email,
        systemRole: user.systemRole,
        type: "access",
      },
      this.config.accessSecret,
      this.config.accessTtl,
    );
  }

  issueRefreshToken(user: User): Promise<SignedToken> {
    return this.signToken<RefreshTokenPayload>(
      {
        sub: user.id,
        email: user.email,
        type: "refresh",
      },
      this.config.refreshSecret,
      this.config.refreshTtl,
    );
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
      token,
      {
        secret: this.config.refreshSecret,
      },
    );

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    return payload;
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: this.config.accessSecret,
    });

    if (payload.type !== "access") {
      throw new UnauthorizedException("Invalid access token.");
    }

    return payload;
  }

  private async signToken<T extends object>(
    payload: T,
    secret: string,
    expiresIn: string,
  ): Promise<SignedToken> {
    const token = await this.jwtService.signAsync(payload as Record<string, unknown>, {
      secret,
      expiresIn: expiresIn as never,
    });

    return {
      token,
      expiresIn,
    };
  }
}
