import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

import { AppLogger } from "./app-logger.service";

const isProduction = process.env.NODE_ENV === "production";
const logsDir = join(process.cwd(), "logs");
mkdirSync(logsDir, { recursive: true });

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: isProduction ? "info" : "debug",
        customProps: (req) => {
          const user = (req as { user?: { id?: string; systemRole?: string } }).user;
          return user
            ? { userId: user.id, systemRole: user.systemRole }
            : {};
        },
        serializers: {
          req: (req: { id?: string; method?: string; url?: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode?: number }) => ({
            statusCode: res.statusCode,
          }),
        },
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            'req.headers["set-cookie"]',
            "*.password",
            "*.passwordHash",
            "*.refreshToken",
          ],
          censor: "[REDACTED]",
        },
        transport: {
          targets: [
            ...(isProduction
              ? [
                  {
                    target: "pino/file",
                    level: "info",
                    options: { destination: 1 },
                  },
                ]
              : [
                  {
                    target: "pino-pretty",
                    level: "debug",
                    options: {
                      singleLine: false,
                      translateTime: "SYS:HH:MM:ss.l",
                      ignore: "pid,hostname,req,res,responseTime",
                    },
                  },
                ]),
            {
              target: "pino-roll",
              level: "info",
              options: {
                file: join(logsDir, "app"),
                frequency: "daily",
                size: "20m",
                extension: ".log",
                mkdir: true,
                dateFormat: "yyyy-MM-dd",
              },
            },
          ],
        },
      },
    }),
  ],
  providers: [AppLogger],
  exports: [AppLogger, PinoLoggerModule],
})
export class LoggerModule {}
