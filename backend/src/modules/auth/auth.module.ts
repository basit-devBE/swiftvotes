import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigType } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { authConfig } from "../../core/config/auth.config";
import { UsersModule } from "../users/users.module";
import { AUTH_TOKEN_SERVICE } from "./application/auth.tokens";
import { MAGIC_LINK_TOKENS_REPOSITORY } from "./application/ports/magic-link-tokens.repository";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { MagicLinkLoginUseCase } from "./application/use-cases/magic-link-login.use-case";
import { RefreshSessionUseCase } from "./application/use-cases/refresh-session.use-case";
import { PrismaMagicLinkTokensRepository } from "./infrastructure/persistence/prisma-magic-link-tokens.repository";
import { JwtTokenService } from "./infrastructure/security/jwt-token.service";
import { AuthController } from "./presentation/http/auth.controller";
import { JwtAuthGuard } from "./presentation/http/guards/jwt-auth.guard";
import { SystemRoleGuard } from "./presentation/http/guards/system-role.guard";
import { JwtStrategy } from "./presentation/http/strategies/jwt.strategy";

@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    UsersModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(authConfig)],
      inject: [authConfig.KEY],
      useFactory: (config: ConfigType<typeof authConfig>) => ({
        secret: config.accessSecret,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    MagicLinkLoginUseCase,
    RefreshSessionUseCase,
    JwtStrategy,
    {
      provide: AUTH_TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
    {
      provide: MAGIC_LINK_TOKENS_REPOSITORY,
      useClass: PrismaMagicLinkTokensRepository,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SystemRoleGuard,
    },
  ],
  exports: [AUTH_TOKEN_SERVICE, MAGIC_LINK_TOKENS_REPOSITORY],
})
export class AuthModule {}
