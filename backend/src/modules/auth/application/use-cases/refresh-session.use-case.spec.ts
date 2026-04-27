import { UnauthorizedException } from "@nestjs/common";

import { UsersRepository } from "../../../users/application/ports/users.repository";
import { SystemRole } from "../../../users/domain/system-role";
import { UserStatus } from "../../../users/domain/user-status";
import { RefreshSessionUseCase } from "./refresh-session.use-case";
import { AuthTokenService } from "../ports/auth-token.service";

describe("RefreshSessionUseCase", () => {
  it("issues a fresh session for an active user", async () => {
    const repository: jest.Mocked<UsersRepository> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "user@swiftvote.app",
        fullName: "Swift Vote",
        passwordHash: "hash",
        systemRole: SystemRole.NONE,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: jest.fn(),
      updateStatus: jest.fn(),
    };
    const tokenService: jest.Mocked<AuthTokenService> = {
      issueAccessToken: jest.fn().mockResolvedValue({
        token: "new-access",
        expiresIn: "15m",
      }),
      issueRefreshToken: jest.fn().mockResolvedValue({
        token: "new-refresh",
        expiresIn: "7d",
      }),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn().mockResolvedValue({
        sub: "user-1",
        email: "user@swiftvote.app",
        type: "refresh",
      }),
    };

    const useCase = new RefreshSessionUseCase(repository, tokenService);

    const session = await useCase.execute("refresh-token");

    expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith(
      "refresh-token",
    );
    expect(session.accessToken.token).toBe("new-access");
    expect(session.refreshToken.token).toBe("new-refresh");
  });

  it("rejects refresh when the user is missing or inactive", async () => {
    const repository: jest.Mocked<UsersRepository> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      updateStatus: jest.fn(),
    };
    const tokenService: jest.Mocked<AuthTokenService> = {
      issueAccessToken: jest.fn(),
      issueRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn().mockResolvedValue({
        sub: "user-1",
        email: "user@swiftvote.app",
        type: "refresh",
      }),
    };

    const useCase = new RefreshSessionUseCase(repository, tokenService);

    await expect(useCase.execute("refresh-token")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
