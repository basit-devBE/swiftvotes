import * as crypto from "node:crypto";

import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import { appConfig } from "../../../../core/config/app.config";
import { PASSWORD_HASHER, PasswordHasher } from "../../../../core/security/password-hasher";
import { MAGIC_LINK_TOKENS_REPOSITORY, MagicLinkTokensRepository } from "../../../auth/application/ports/magic-link-tokens.repository";
import { NOTIFICATIONS_SERVICE } from "../../../notifications/application/notifications.tokens";
import { NotificationsService } from "../../../notifications/application/ports/notifications.service";
import { USERS_REPOSITORY } from "../../../users/application/users.tokens";
import { UsersRepository } from "../../../users/application/ports/users.repository";
import { SystemRole } from "../../../users/domain/system-role";
import { UserStatus } from "../../../users/domain/user-status";
import { CONTESTANTS_REPOSITORY } from "../contestants.tokens";
import { ContestantsRepository } from "../ports/contestants.repository";

const MAGIC_LINK_TTL_DAYS = 7;

export type ProvisionContestantAccountInput = {
  contestantId: string;
  contestantCode: string;
  name: string;
  email: string;
  eventName: string;
};

@Injectable()
export class ProvisionContestantAccountUseCase {
  private readonly logger = new Logger(ProvisionContestantAccountUseCase.name);

  constructor(
    @Inject(CONTESTANTS_REPOSITORY)
    private readonly contestantsRepository: ContestantsRepository,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(MAGIC_LINK_TOKENS_REPOSITORY)
    private readonly magicLinkTokensRepository: MagicLinkTokensRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(NOTIFICATIONS_SERVICE)
    private readonly notificationsService: NotificationsService,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
  ) {}

  async execute(input: ProvisionContestantAccountInput): Promise<void> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const defaultPassword = `Vote@${input.contestantCode}`;
    const passwordHash = await this.passwordHasher.hash(defaultPassword);

    this.logger.log(
      `Provisioning account for ${normalizedEmail} — code: ${input.contestantCode}, password: ${defaultPassword}`,
    );

    const { user, created } = await this.usersRepository.upsertByEmail(
      normalizedEmail,
      {
        email: normalizedEmail,
        fullName: input.name,
        passwordHash,
        systemRole: SystemRole.NONE,
        status: UserStatus.ACTIVE,
      },
    );

    await this.contestantsRepository.updateUserId(input.contestantId, user.id);

    // Invalidate any previous magic links for this user, then issue a fresh one
    await this.magicLinkTokensRepository.invalidateForUser(user.id);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.magicLinkTokensRepository.create({ userId: user.id, token, expiresAt });

    const magicLinkUrl = `${this.app.frontendOrigin}/auth/magic-link?token=${token}`;

    // Only send the welcome email when a new account was created.
    // If the user already existed their password stays unchanged and we skip the email.
    if (created) {
      await this.notificationsService.sendContestantWelcomeEmail({
        recipientEmail: normalizedEmail,
        recipientName: input.name,
        eventName: input.eventName,
        contestantCode: input.contestantCode,
        defaultPassword,
        magicLinkUrl,
      });
    }
  }
}
