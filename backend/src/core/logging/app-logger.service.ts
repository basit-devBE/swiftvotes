import { ConsoleLogger, Injectable, LogLevel } from "@nestjs/common";

@Injectable()
export class AppLogger extends ConsoleLogger {
  private readonly isProduction = process.env.NODE_ENV === "production";

  constructor() {
    super({
      timestamp: true,
    });
  }

  override log(message: unknown, context?: string): void {
    this.write("log", message, context);
  }

  override error(message: unknown, stack?: string, context?: string): void {
    this.write("error", message, context, stack);
  }

  override warn(message: unknown, context?: string): void {
    this.write("warn", message, context);
  }

  override debug(message: unknown, context?: string): void {
    this.write("debug", message, context);
  }

  override verbose(message: unknown, context?: string): void {
    this.write("verbose", message, context);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    stack?: string,
  ): void {
    if (!this.isProduction) {
      switch (level) {
        case "error":
          super.error(message, stack, context);
          return;
        case "warn":
          super.warn(message, context);
          return;
        case "debug":
          super.debug(message, context);
          return;
        case "verbose":
          super.verbose(message, context);
          return;
        default:
          super.log(message, context);
      }
      return;
    }

    const payload = JSON.stringify({
      level,
      context,
      message,
      stack,
      timestamp: new Date().toISOString(),
    });

    if (level === "error") {
      process.stderr.write(`${payload}\n`);
      return;
    }

    process.stdout.write(`${payload}\n`);
  }
}
