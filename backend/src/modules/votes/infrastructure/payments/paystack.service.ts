import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import {
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { PinoLogger } from "nestjs-pino";

import { paystackConfig } from "../../../../core/config/paystack.config";

export type InitializeTransactionInput = {
  email: string;
  amountMinor: number;
  currency: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export type InitializeTransactionResult = {
  authorizationUrl: string;
  reference: string;
  accessCode: string;
};

export type VerifyTransactionStatus = "success" | "failed" | "abandoned" | "pending";

export type VerifyTransactionResult = {
  status: VerifyTransactionStatus;
  reference: string;
  amount: number;
  currency: string;
  paidAt: string | null;
};

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at: string | null;
  };
};

@Injectable()
export class PaystackService {
  constructor(
    @Inject(paystackConfig.KEY)
    private readonly config: ConfigType<typeof paystackConfig>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("PaystackService");
  }

  generateReference(): string {
    return `swv_${randomUUID()}`;
  }

  async initializeTransaction(
    input: InitializeTransactionInput,
  ): Promise<InitializeTransactionResult> {
    this.assertSecretKey();

    const reference = this.generateReference();
    const body = {
      email: input.email,
      amount: input.amountMinor,
      currency: input.currency,
      reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
    };

    const url = `${this.config.baseUrl}/transaction/initialize`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(
        { scope: "paystack", op: "initialize", reference, err: (err as Error).message },
        "paystack initialize transport error",
      );
      throw new ServiceUnavailableException("Could not reach payment provider.");
    }

    const json = (await response.json().catch(() => ({}))) as PaystackInitializeResponse;

    if (!response.ok || !json.status || !json.data) {
      this.logger.warn(
        {
          scope: "paystack",
          op: "initialize",
          reference,
          httpStatus: response.status,
          message: json.message,
        },
        "paystack initialize rejected",
      );
      throw new InternalServerErrorException(
        json.message || "Failed to initialize payment.",
      );
    }

    this.logger.info(
      { scope: "paystack", op: "initialize", reference, httpStatus: response.status },
      "paystack initialize success",
    );

    return {
      authorizationUrl: json.data.authorization_url,
      reference: json.data.reference,
      accessCode: json.data.access_code,
    };
  }

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    this.assertSecretKey();

    const url = `${this.config.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
          Accept: "application/json",
        },
      });
    } catch (err) {
      this.logger.error(
        { scope: "paystack", op: "verify", reference, err: (err as Error).message },
        "paystack verify transport error",
      );
      throw new ServiceUnavailableException("Could not reach payment provider.");
    }

    const json = (await response.json().catch(() => ({}))) as PaystackVerifyResponse;

    if (!response.ok || !json.status || !json.data) {
      this.logger.warn(
        {
          scope: "paystack",
          op: "verify",
          reference,
          httpStatus: response.status,
          message: json.message,
        },
        "paystack verify rejected",
      );
      throw new InternalServerErrorException(
        json.message || "Failed to verify payment.",
      );
    }

    const status = this.normalizeStatus(json.data.status);
    this.logger.info(
      {
        scope: "paystack",
        op: "verify",
        reference,
        httpStatus: response.status,
        paystackStatus: json.data.status,
        normalized: status,
      },
      "paystack verify success",
    );

    return {
      status,
      reference: json.data.reference,
      amount: json.data.amount,
      currency: json.data.currency,
      paidAt: json.data.paid_at,
    };
  }

  verifyWebhookSignature(rawBody: Buffer | string, signatureHeader: string | undefined): boolean {
    if (!signatureHeader || !this.config.secretKey) {
      return false;
    }
    const expected = createHmac("sha512", this.config.secretKey)
      .update(typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody)
      .digest("hex");
    const provided = signatureHeader.trim();

    if (expected.length !== provided.length) {
      return false;
    }
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
    } catch {
      return false;
    }
  }

  private assertSecretKey(): void {
    if (!this.config.secretKey) {
      this.logger.error(
        { scope: "paystack" },
        "PAYSTACK_SECRET_KEY is not configured",
      );
      throw new InternalServerErrorException(
        "Payment provider is not configured.",
      );
    }
  }

  private normalizeStatus(raw: string): VerifyTransactionStatus {
    const lower = raw.toLowerCase();
    if (lower === "success") return "success";
    if (lower === "failed") return "failed";
    if (lower === "abandoned") return "abandoned";
    return "pending";
  }
}
