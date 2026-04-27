import {
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { authConfig } from "../../../../../core/config/auth.config";
import { USERS_REPOSITORY } from "../../../../users/application/users.tokens";
import { UsersRepository } from "../../../../users/application/ports/users.repository";
import { UserStatus } from "../../../../users/domain/user-status";
import { AccessTokenPayload } from "../../../domain/access-token-payload";
import { AuthenticatedRequestUser } from "../../../domain/authenticated-request-user";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(authConfig.KEY)
    config: ConfigType<typeof authConfig>,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessSecret,
    });
  }

  async validate(
    payload: AccessTokenPayload,
  ): Promise<AuthenticatedRequestUser> {
    if (payload.type !== "access") {
      throw new UnauthorizedException("Invalid access token.");
    }

    const user = await this.usersRepository.findById(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("User not found or inactive.");
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      systemRole: user.systemRole,
    };
  }
}
