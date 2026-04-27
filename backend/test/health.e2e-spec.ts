import { INestApplication, ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AppConfig } from "../src/core/config/app.config";

describe("Health endpoint (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    const configService = app.get(ConfigService);
    const appConfig = configService.getOrThrow<AppConfig>("app");

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
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/api/v1/system/health (GET)", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/system/health")
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: "ok",
        service: "swiftvote-api",
      }),
    );
  });
});
