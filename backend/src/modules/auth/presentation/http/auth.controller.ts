import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { IsString, IsNotEmpty } from "class-validator";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";

import { AppConfig } from "../../../../core/config/app.config";
import { AuthConfig } from "../../../../core/config/auth.config";
import { LoginUseCase } from "../../application/use-cases/login.use-case";
import { MagicLinkLoginUseCase } from "../../application/use-cases/magic-link-login.use-case";
import { RefreshSessionUseCase } from "../../application/use-cases/refresh-session.use-case";

class MagicLinkLoginDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
import { buildRefreshCookieOptions } from "./auth-cookie";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./decorators/public.decorator";
import { AuthSessionResponseDto } from "./responses/auth-session.response.dto";

@Controller({
  path: "auth",
  version: "1",
})
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly loginUseCase: LoginUseCase,
    private readonly magicLinkLoginUseCase: MagicLinkLoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
  ) {}

  @Public()
  @Post("login")
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    const session = await this.loginUseCase.execute(body);
    this.setRefreshCookie(response, session.refreshToken.token);

    return AuthSessionResponseDto.fromResult({
      accessToken: session.accessToken.token,
      accessTokenExpiresIn: session.accessToken.expiresIn,
      user: session.user,
    });
  }

  @Public()
  @Post("magic-link")
  async magicLinkLogin(
    @Body() body: MagicLinkLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    const session = await this.magicLinkLoginUseCase.execute(body.token);
    this.setRefreshCookie(response, session.refreshToken.token);

    return AuthSessionResponseDto.fromResult({
      accessToken: session.accessToken.token,
      accessTokenExpiresIn: session.accessToken.expiresIn,
      user: session.user,
    });
  }

  @Public()
  @Post("refresh")
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    const auth = this.configService.getOrThrow<AuthConfig>("auth");
    const refreshToken = request.cookies?.[auth.refreshCookieName];

    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token cookie is missing.");
    }

    const session = await this.refreshSessionUseCase.execute(refreshToken);
    this.setRefreshCookie(response, session.refreshToken.token);

    return AuthSessionResponseDto.fromResult({
      accessToken: session.accessToken.token,
      accessTokenExpiresIn: session.accessToken.expiresIn,
      user: session.user,
    });
  }

  @Public()
  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response): { success: true } {
    const app = this.configService.getOrThrow<AppConfig>("app");
    const auth = this.configService.getOrThrow<AuthConfig>("auth");

    response.clearCookie(
      auth.refreshCookieName,
      buildRefreshCookieOptions(app, auth),
    );

    return { success: true };
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    const app = this.configService.getOrThrow<AppConfig>("app");
    const auth = this.configService.getOrThrow<AuthConfig>("auth");

    response.cookie(
      auth.refreshCookieName,
      refreshToken,
      buildRefreshCookieOptions(app, auth),
    );
  }
}
