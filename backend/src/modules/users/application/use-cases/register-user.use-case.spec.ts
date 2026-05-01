import { ConflictException } from "@nestjs/common";

import { PasswordHasher } from "../../../../core/security/password-hasher";
import { SystemRole } from "../../domain/system-role";
import { UserStatus } from "../../domain/user-status";
import { UsersRepository } from "../ports/users.repository";
import { RegisterUserUseCase } from "./register-user.use-case";

describe("RegisterUserUseCase", () => {
  it("registers a user with normalized email and hashed password", async () => {
    const repository: jest.Mocked<UsersRepository> = {
      create: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "new@swiftvote.app",
        fullName: "New User",
        passwordHash: "hashed-password",
        systemRole: SystemRole.NONE,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findAll: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      upsertByEmail: jest.fn(),
    };
    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: jest.fn().mockResolvedValue("hashed-password"),
      compare: jest.fn(),
    };

    const useCase = new RegisterUserUseCase(repository, passwordHasher);

    const user = await useCase.execute({
      email: " New@SwiftVote.app ",
      fullName: "New User",
      password: "password123",
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith("password123");
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@swiftvote.app",
        passwordHash: "hashed-password",
      }),
    );
    expect(user.email).toBe("new@swiftvote.app");
  });

  it("rejects duplicate emails", async () => {
    const repository: jest.Mocked<UsersRepository> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "exists@swiftvote.app",
        fullName: "Existing User",
        passwordHash: "hash",
        systemRole: SystemRole.NONE,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findById: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      upsertByEmail: jest.fn(),
    };
    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    const useCase = new RegisterUserUseCase(repository, passwordHasher);

    await expect(
      useCase.execute({
        email: "exists@swiftvote.app",
        fullName: "Existing User",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
