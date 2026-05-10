import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import { smsConfig } from "../../../../core/config/sms.config";
import { AppLogger } from "../../../../core/logging/app-logger.service";

type ArkeselSendResponse = Record<string, unknown>;

@Injectable()
export class ArkeselSmsService {
  constructor(
    @Inject(smsConfig.KEY)
    private readonly sms: ConfigType<typeof smsConfig>,
    private readonly logger: AppLogger,
  ) {}

  async send(input: { recipient: string; message: string }): Promise<void> {
    if (!this.sms.enabled) {
      this.logger.warn(
        `SMS disabled — skipping message to ${input.recipient}`,
        "Notifications",
      );
      return;
    }

    if (!this.sms.arkeselApiKey || !this.sms.senderId) {
      this.logger.warn(
        `Arkesel SMS not configured — skipping message to ${input.recipient}`,
        "Notifications",
      );
      return;
    }

    const recipient = this.toInternationalPhone(input.recipient);
    if (!recipient) {
      this.logger.warn(
        `Invalid SMS recipient "${input.recipient}" — skipping message`,
        "Notifications",
      );
      return;
    }

    const url = `${this.sms.arkeselBaseUrl.replace(/\/$/, "")}/sms/send`;
    const body = {
      sender: this.sms.senderId,
      message: input.message,
      recipients: [recipient],
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "api-key": this.sms.arkeselApiKey,
        },
        body: JSON.stringify(body),
      });
      const json = (await response.json().catch(() => ({}))) as ArkeselSendResponse;

      if (!response.ok) {
        this.logger.warn(
          `Arkesel SMS rejected message to ${recipient}: ${response.status} ${JSON.stringify(json)}`,
          "Notifications",
        );
        return;
      }

      this.logger.log(
        `SMS sent to ${recipient}: ${JSON.stringify(json)}`,
        "Notifications",
      );
    } catch (err) {
      this.logger.error(
        `Failed to send SMS to ${recipient}: ${(err as Error).message}`,
        (err as Error).stack,
        "Notifications",
      );
    }
  }

  private toInternationalPhone(value: string): string | null {
    const digits = value.replace(/\D/g, "");
    if (/^0\d{9}$/.test(digits)) return `233${digits.slice(1)}`;
    if (/^233\d{9}$/.test(digits)) return digits;
    return null;
  }
}
