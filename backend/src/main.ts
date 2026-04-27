import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { AppConfig } from "./core/config/app.config";
import { AppLogger } from "./core/logging/app-logger.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(AppLogger);
  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>("app");

  app.useLogger(logger);
  app.setGlobalPrefix(appConfig.apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.enableShutdownHooks();

  await app.listen(appConfig.port);
  logger.log(
    `HTTP server listening on port ${appConfig.port}`,
    "Bootstrap",
  );
}

void bootstrap();
