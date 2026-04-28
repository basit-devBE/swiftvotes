import * as path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import * as ejs from "ejs";
import * as nodemailer from "nodemailer";

import { appConfig } from "../../../../core/config/app.config";
import { emailConfig } from "../../../../core/config/email.config";
import { AppLogger } from "../../../../core/logging/app-logger.service";
import {
  EventNotificationPayload,
  NominationReceivedPayload,
  NotificationsService,
} from "../../application/ports/notifications.service";

const TEMPLATES_DIR = path.join(__dirname, "templates");
const LOGO_CID = "swiftvote-logo@mail";
const LOGO_PATH = path.join(__dirname, "assets", "swiftvote-logo.png");

const LOGO_ATTACHMENT = {
  filename: "swiftvote-logo.png",
  path: LOGO_PATH,
  cid: LOGO_CID,
};

@Injectable()
export class NodemailerNotificationsService implements NotificationsService {
  private readonly transporter: nodemailer.Transporter;

  constructor(
    @Inject(emailConfig.KEY)
    private readonly email: ConfigType<typeof emailConfig>,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
    private readonly logger: AppLogger,
  ) {
    this.transporter = nodemailer.createTransport({
      host: email.host,
      port: email.port,
      secure: email.secure,
      auth:
        email.user && email.pass
          ? { user: email.user, pass: email.pass }
          : undefined,
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private eventUrl(eventId: string): string {
    return `${this.app.frontendOrigin}/events/${eventId}`;
  }

  private async render(
    template: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    const file = path.join(TEMPLATES_DIR, `${template}.ejs`);
    return ejs.renderFile(file, {
      ...data,
      logoUrl: `cid:${LOGO_CID}`,
      frontendUrl: this.app.frontendOrigin,
    });
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.email.host || !this.email.user) {
      this.logger.warn(
        `SMTP not configured — skipping email to ${to}: "${subject}"`,
        "Notifications",
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.email.from,
        to,
        subject,
        html,
        attachments: [LOGO_ATTACHMENT],
      });
      this.logger.log(
        `Email sent to ${to}: "${subject}"`,
        "Notifications",
      );
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${to}: ${(err as Error).message}`,
        (err as Error).stack,
        "Notifications",
      );
    }
  }

  // ── NotificationsService implementation ─────────────────────────────────

  async sendEventPendingApprovalEmail(
    payload: EventNotificationPayload,
  ): Promise<void> {
    const subject = `Your event has been submitted for review — ${payload.eventName}`;
    const html = await this.render("event-pending-approval", {
      subject,
      recipientName: payload.recipientName,
      eventName: payload.eventName,
      eventUrl: this.eventUrl(payload.eventId),
    });
    await this.send(payload.recipientEmail, subject, html);
  }

  async sendEventApprovedEmail(
    payload: EventNotificationPayload,
  ): Promise<void> {
    const subject = `Your event has been approved — ${payload.eventName}`;
    const html = await this.render("event-approved", {
      subject,
      recipientName: payload.recipientName,
      eventName: payload.eventName,
      eventUrl: this.eventUrl(payload.eventId),
    });
    await this.send(payload.recipientEmail, subject, html);
  }

  async sendEventRejectedEmail(
    payload: EventNotificationPayload,
  ): Promise<void> {
    const subject = `Update on your event — ${payload.eventName}`;
    const html = await this.render("event-rejected", {
      subject,
      recipientName: payload.recipientName,
      eventName: payload.eventName,
      eventUrl: this.eventUrl(payload.eventId),
      rejectionReason: payload.rejectionReason ?? null,
    });
    await this.send(payload.recipientEmail, subject, html);
  }

  async sendAdminNewEventPendingEmail(
    payload: EventNotificationPayload,
  ): Promise<void> {
    const adminEmail = this.email.adminEmail;
    if (!adminEmail) {
      this.logger.warn(
        "SUPER_ADMIN_EMAIL not set — skipping admin event notification",
        "Notifications",
      );
      return;
    }

    const subject = `New event pending review — ${payload.eventName}`;
    const html = await this.render("admin-event-pending", {
      subject,
      recipientName: payload.recipientName,
      recipientEmail: payload.recipientEmail,
      eventName: payload.eventName,
      reviewUrl: this.eventUrl(payload.eventId),
    });
    await this.send(adminEmail, subject, html);
  }

  async sendNominationReceivedEmail(
    payload: NominationReceivedPayload,
  ): Promise<void> {
    const subject = `New nomination received — ${payload.eventName}`;
    const html = await this.render("nomination-received", {
      subject,
      recipientName: payload.recipientName,
      eventName: payload.eventName,
      nomineeName: payload.nomineeName,
      categoryName: payload.categoryName,
      submitterName: payload.submitterName,
      manageUrl: `${this.app.frontendOrigin}/events/${payload.eventId}/manage`,
    });
    await this.send(payload.recipientEmail, subject, html);
  }
}
