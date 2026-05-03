import { Injectable, LoggerService } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

@Injectable()
export class AppLogger implements LoggerService {
  constructor(private readonly pino: PinoLogger) {
    this.pino.setContext("App");
  }

  log(message: unknown, context?: string): void {
    this.pino.info({ context }, this.toString(message));
  }

  error(message: unknown, stack?: string, context?: string): void {
    this.pino.error({ context, stack }, this.toString(message));
  }

  warn(message: unknown, context?: string): void {
    this.pino.warn({ context }, this.toString(message));
  }

  debug(message: unknown, context?: string): void {
    this.pino.debug({ context }, this.toString(message));
  }

  verbose(message: unknown, context?: string): void {
    this.pino.trace({ context }, this.toString(message));
  }

  private toString(message: unknown): string {
    if (typeof message === "string") return message;
    if (message instanceof Error) return message.message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
