import { UnauthorizedException } from "@nestjs/common";

import { PasswordHasher } from "../../../../core/security/password-hasher";
import { UsersRepository } from "../../../users/application/ports/users.repository";
import { SystemRole } from "../../../users/domain/system-role";
import { UserStatus } from "../../../users/domain/user-status";
import { LoginUseCase } from "./login.use-case";
import { AuthTokenService } from "../ports/auth-token.service";

describe("LoginUseCase", () => {
  it("returns access and refresh tokens for an active user", async () => {
    const repository: jest.Mocked<UsersRepository> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "user@swiftvote.app",
        fullName: "Swift Vote",
        passwordHash: "hash",
        systemRole: SystemRole.NONE,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findById: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
    };
    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: jest.fn(),
      compare: jest.fn().mockResolvedValue(true),
    };
    const tokenService: jest.Mocked<AuthTokenService> = {
      issueAccessToken: jest.fn().mockResolvedValue({
        token: "access-token",
        expiresIn: "15m",
      }),
      issueRefreshToken: jest.fn().mockResolvedValue({
        token: "refresh-token",
        expiresIn: "7d",
      }),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };

    const useCase = new LoginUseCase(repository, passwordHasher, tokenService);

    const session = await useCase.execute({
      email: "user@swiftvote.app",
      password: "password123",
    });

    expect(session.accessToken.token).toBe("access-token");
    expect(session.refreshToken.token).toBe("refresh-token");
    expect(passwordHasher.compare).toHaveBeenCalledWith("password123", "hash");
  });

  it("rejects suspended users", async () => {
    const repository: jest.Mocked<UsersRepository> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "user@swiftvote.app",
        fullName: "Swift Vote",
        passwordHash: "hash",
        systemRole: SystemRole.NONE,
        status: UserStatus.SUSPENDED,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findById: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
    };
    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: jest.fn(),
      compare: jest.fn(),
    };
    const tokenService: jest.Mocked<AuthTokenService> = {
      issueAccessToken: jest.fn(),
      issueRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };

    const useCase = new LoginUseCase(repository, passwordHasher, tokenService);

    await expect(
      useCase.execute({
        email: "user@swiftvote.app",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
