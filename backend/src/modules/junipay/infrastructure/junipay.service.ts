import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { createSign, randomUUID } from "node:crypto";
import { PinoLogger } from "nestjs-pino";

import { junipayConfig } from "../../../core/config/junipay.config";

export type JunipayMobileMoneyProvider = "mtn" | "vodafone" | "airteltigo";

export type JunipayCollectionInput = {
  reference?: string;
  phoneNumber: string;
  provider: JunipayMobileMoneyProvider;
  amountMinor: number;
  currency: string;
  senderEmail: string;
  description: string;
  callbackUrl?: string | null;
};

export type JunipayTransactionStatus =
  | "success"
  | "pending"
  | "failed"
  | "abandoned"
  | "unknown";

export type JunipayCollectionResult = {
  reference: string;
  providerRef: string | null;
  status: JunipayTransactionStatus;
  message: string | null;
  raw: unknown;
};

export type JunipayStatusResult = JunipayCollectionResult & {
  amountMinor: number | null;
  currency: string | null;
  paidAt: string | null;
  feesMinor: number | null;
  mobileNumber: string | null;
};

@Injectable()
export class JunipayService {
  constructor(
    private readonly logger: PinoLogger,
    @Inject(junipayConfig.KEY)
    private readonly config: ConfigType<typeof junipayConfig>,
  ) {
    this.logger.setContext("JunipayService");
  }

  async initializeMobileMoneyCollection(
    input: JunipayCollectionInput,
  ): Promise<JunipayCollectionResult> {
    this.assertConfigured();

    const reference = input.reference ?? `swv_${randomUUID()}`;
    const amount = this.toMajorAmount(input.amountMinor);
    const body = {
      amount,
      tot_amnt: amount,
      provider: input.provider,
      phoneNumber: input.phoneNumber,
      channel: "mobile_money",
      senderEmail: input.senderEmail,
      description: input.description,
      foreignID: reference,
      callbackUrl: input.callbackUrl || this.config.callbackUrl,
    };

    const raw = await this.post("/payment", body);
    const result = this.normalizeCollection(raw, reference);

    this.logger.info(
      {
        scope: "junipay",
        op: "initialize_mobile_money",
        reference,
        provider: input.provider,
        httpProviderRef: result.providerRef,
        junipayStatus: result.status,
      },
      "junipay mobile money collection initialized",
    );

    return result;
  }

  async checkTransactionStatus(
    referenceOrProviderRef: string,
  ): Promise<JunipayStatusResult> {
    this.assertConfigured();

    const raw = await this.post("/checktranstatus", {
      transID: referenceOrProviderRef,
    });
    const base = this.normalizeCollection(raw, referenceOrProviderRef);
    const data = this.extractData(raw);

    return {
      ...base,
      amountMinor: this.extractAmountMinor(data),
      currency: this.pickString(data, ["currency", "Currency"]) ?? null,
      paidAt:
        this.pickString(data, [
          "paidAt",
          "paid_at",
          "datePaid",
          "transactionDate",
          "createdAt",
          "date",
        ]) ?? null,
      feesMinor: this.extractFeeMinor(data),
      mobileNumber:
        this.pickString(data, ["phoneNumber", "phone", "mobileNumber"]) ?? null,
    };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<unknown> {
    const url = new URL(path, this.config.baseUrl).toString();
    const token = this.generateToken();

    this.logger.info(
      {
        scope: "junipay",
        op: "request",
        path,
        body,
      },
      "sending junipay request",
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        clientid: this.config.clientId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    const raw = this.parseJson(text);

    if (!response.ok) {
      this.logger.warn(
        {
          scope: "junipay",
          op: "request",
          path,
          httpStatus: response.status,
          response: raw,
        },
        "junipay request failed",
      );
      throw new ServiceUnavailableException("JuniPay request failed.");
    }

    return raw;
  }

  private generateToken(): string {
    const privateKey = Buffer.from(
      this.config.privateKeyBase64,
      "base64",
    ).toString("utf8");
    const now = Math.floor(Date.now() / 1000);
    const header = this.base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = this.base64url(
      JSON.stringify({
        payload: "swiftvotes_collection",
        clientid: this.config.clientId,
        clientId: this.config.clientId,
        iat: now,
        exp: now + 5 * 60,
      }),
    );
    const signingInput = `${header}.${payload}`;
    const signature = createSign("RSA-SHA256")
      .update(signingInput)
      .sign(privateKey);
    return `${signingInput}.${this.base64url(signature)}`;
  }

  private normalizeCollection(
    raw: unknown,
    fallbackReference: string,
  ): JunipayCollectionResult {
    const data = this.extractData(raw);
    const reference =
      this.pickString(data, ["foreignID", "foreignId", "reference"]) ??
      fallbackReference;
    const providerRef =
      this.pickString(data, [
        "transID",
        "transactionID",
        "transactionId",
        "id",
        "providerRef",
      ]) ?? null;
    const statusText =
      this.pickString(data, [
        "status",
        "transactionStatus",
        "paymentStatus",
        "state",
      ]) ??
      this.pickString(raw, ["status", "message"]) ??
      "";

    return {
      reference,
      providerRef,
      status: this.normalizeStatus(statusText),
      message:
        this.pickString(data, ["message", "responseMessage", "reason"]) ??
        this.pickString(raw, ["message"]) ??
        null,
      raw,
    };
  }

  private normalizeStatus(status: string): JunipayTransactionStatus {
    const value = status.toLowerCase();
    if (["success", "successful", "paid", "completed", "approved"].includes(value)) {
      return "success";
    }
    if (["failed", "failure", "declined", "rejected", "error"].includes(value)) {
      return "failed";
    }
    if (["abandoned", "cancelled", "canceled"].includes(value)) {
      return "abandoned";
    }
    if (["pending", "processing", "ongoing", "queued", "initiated"].includes(value)) {
      return "pending";
    }
    return "unknown";
  }

  private extractData(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== "object") return {};
    const object = raw as Record<string, unknown>;
    const data = object.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    return object;
  }

  private pickString(source: unknown, keys: string[]): string | undefined {
    if (!source || typeof source !== "object") return undefined;
    const object = source as Record<string, unknown>;
    for (const key of keys) {
      const value = object[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number") return String(value);
    }
    return undefined;
  }

  private extractAmountMinor(source: Record<string, unknown>): number | null {
    const raw =
      source.amount ?? source.tot_amnt ?? source.totalAmount ?? source.amountPaid;
    return this.toMinor(raw);
  }

  private extractFeeMinor(source: Record<string, unknown>): number | null {
    return this.toMinor(source.fee ?? source.fees ?? source.charge);
  }

  private toMinor(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.round(value * 100);
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
    }
    return null;
  }

  private toMajorAmount(amountMinor: number): number {
    return Number((amountMinor / 100).toFixed(2));
  }

  private parseJson(text: string): unknown {
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  private base64url(value: string | Buffer): string {
    return Buffer.from(value)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  private assertConfigured(): void {
    if (!this.config.clientId || !this.config.privateKeyBase64) {
      throw new BadRequestException("JuniPay is not configured.");
    }
  }
}
