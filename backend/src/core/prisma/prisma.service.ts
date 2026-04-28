import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

import { DatabaseConfig } from "../config/database.config";

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(configService: ConfigService) {
    const database = configService.getOrThrow<DatabaseConfig>("database");

    super({
      datasources: {
        db: {
          url: database.url,
        },
      },
    });
  }
}
