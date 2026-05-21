import { promises as fs } from "node:fs";
import * as path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import * as ejs from "ejs";
import * as nodemailer from "nodemailer";
import QRCode from "qrcode";
import { Resend } from "resend";

import { appConfig } from "../../../../core/config/app.config";
import { emailConfig } from "../../../../core/config/email.config";
import { AppLogger } from "../../../../core/logging/app-logger.service";
import {
  ContestantWelcomePayload,
  EventNotificationPayload,
  NominationReceivedPayload,
  NotificationsService,
  TicketConfirmationPayload,
  VoteConfirmationPayload,
} from "../../application/ports/notifications.service";

const TEMPLATES_DIR = path.join(__dirname, "templates");
const LOGO_PATH = path.join(__dirname, "assets", "swiftvote-logo.png");
const LOGO_CID = "swiftvote-logo";

type InlineAttachment = {
  filename: string;
  content: Buffer;
  contentId: string;
};

@Injectable()
export class NodemailerNotificationsService implements NotificationsService {
  private readonly transporter: nodemailer.Transporter;
  private readonly resend: Resend | null;
  private logoBufferPromise: Promise<Buffer> | null = null;

  constructor(
    @Inject(emailConfig.KEY)
    private readonly email: ConfigType<typeof emailConfig>,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
    private readonly logger: AppLogger,
  ) {
    this.resend = email.resendApiKey ? new Resend(email.resendApiKey) : null;
    this.transporter = nodemailer.createTransport({
      host: email.host,
      port: email.port,
      secure: email.secure,
      requireTLS: !email.secure && email.port === 587,
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

  private ticketRedeemUrl(eventId: string, code: string): string {
    return `${this.app.frontendOrigin}/events/${eventId}/tickets/redeem?code=${encodeURIComponent(code)}`;
  }

  private async getLogoAttachment(): Promise<InlineAttachment> {
    if (!this.logoBufferPromise) {
      this.logoBufferPromise = fs.readFile(LOGO_PATH);
    }
    return {
      filename: "swiftvote-logo.png",
      content: await this.logoBufferPromise,
      contentId: LOGO_CID,
    };
  }

  private async buildTicketQrAttachment(
    eventId: string,
    code: string,
    cid: string,
  ): Promise<InlineAttachment> {
    const redeemUrl = `${this.app.frontendOrigin}/events/${eventId}/tickets/redeem?code=${encodeURIComponent(code.trim().toUpperCase())}`;
    const buffer = await QRCode.toBuffer(redeemUrl, {
      type: "png",
      margin: 1,
      color: { dark: "#07111f", light: "#ffffff" },
      width: 256,
    });
    return {
      filename: `${cid}.png`,
      content: buffer,
      contentId: cid,
    };
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

  private async send(
    to: string,
    subject: string,
    html: string,
    extraAttachments: InlineAttachment[] = [],
  ): Promise<void> {
    const logo = await this.getLogoAttachment();
    const attachments: InlineAttachment[] = [logo, ...extraAttachments];

    if (this.resend) {
      try {
        const { error } = await this.resend.emails.send({
          from: this.email.resendFrom,
          to,
          subject,
          html,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentId: a.contentId,
          })),
        });

        if (error) {
          throw new Error(error.message);
        }

        this.logger.log(
          `Email sent via Resend to ${to}: "${subject}"`,
          "Notifications",
        );
        return;
      } catch (err) {
        this.logger.error(
          `Failed to send Resend email to ${to}: ${(err as Error).message}`,
          (err as Error).stack,
          "Notifications",
        );
        return;
      }
    }

    if (!this.email.host || !this.email.user) {
      this.logger.warn(
        `Resend and SMTP not configured — skipping email to ${to}: "${subject}"`,
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
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          cid: a.contentId,
          contentDisposition: "inline",
        })),
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

  async sendContestantWelcomeEmail(payload: ContestantWelcomePayload): Promise<void> {
    const subject = `Your contestant login for ${payload.eventName}`;
    const html = await this.render("contestant-welcome", {
      subject,
      recipientName: payload.recipientName,
      eventName: payload.eventName,
      contestantCode: payload.contestantCode,
      defaultPassword: payload.defaultPassword,
      magicLinkUrl: payload.magicLinkUrl,
    });
    await this.send(payload.recipientEmail, subject, html);
  }

  async sendVoteConfirmationEmail(payload: VoteConfirmationPayload): Promise<void> {
    const subject = `Vote confirmed — ${payload.contestantName} (${payload.eventName})`;
    const amountFormatted = payload.isFree
      ? "Free"
      : `${payload.currency} ${(payload.amountMinor / 100).toFixed(2)}`;
    const html = await this.render("vote-confirmation", {
      subject,
      recipientName: payload.recipientName,
      eventName: payload.eventName,
      contestantName: payload.contestantName,
      contestantCode: payload.contestantCode,
      categoryName: payload.categoryName,
      quantity: payload.quantity,
      amountFormatted,
      isFree: payload.isFree,
      votedAt: payload.votedAt.toLocaleString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      eventUrl: this.eventUrl(payload.eventId),
    });
    await this.send(payload.recipientEmail, subject, html);
  }

  async sendTicketConfirmationEmail(
    payload: TicketConfirmationPayload,
  ): Promise<void> {
    const subject = `Your ticket is confirmed — ${payload.eventName}`;
    const amountFormatted = `${payload.currency} ${(payload.amountMinor / 100).toFixed(2)}`;

    const ticketsWithCids = payload.tickets.map((ticket, index) => ({
      ...ticket,
      qrCid: `ticket-qr-${index}`,
    }));

    const qrAttachments = await Promise.all(
      ticketsWithCids.map((ticket) =>
        this.buildTicketQrAttachment(payload.eventId, ticket.code, ticket.qrCid),
      ),
    );

    const html = await this.render("ticket-confirmation", {
      subject,
      recipientName: payload.recipientName,
      eventName: payload.eventName,
      primaryFlyerUrl: payload.primaryFlyerUrl,
      eventDate: payload.eventStartAt
        ? payload.eventStartAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "Date to be confirmed",
      eventTime: payload.eventStartAt
        ? payload.eventStartAt.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Time to be confirmed",
      venueName: payload.venueName ?? "Venue to be announced",
      venueAddress: payload.venueAddress ?? null,
      quantity: payload.quantity,
      amountFormatted,
      orderReference: payload.orderReference,
      issuedAt: payload.issuedAt.toLocaleString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      eventUrl: this.eventUrl(payload.eventId),
      tickets: ticketsWithCids.map((ticket) => ({
        ...ticket,
        qrImageUrl: `cid:${ticket.qrCid}`,
        redeemUrl: ticket.redeemUrl || this.ticketRedeemUrl(payload.eventId, ticket.code),
      })),
    });
    await this.send(payload.recipientEmail, subject, html, qrAttachments);
  }
}
