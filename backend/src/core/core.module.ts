import { Global, Module } from "@nestjs/common";

import { AppLogger } from "./logging/app-logger.service";
import { PrismaModule } from "./prisma/prisma.module";
import {
  BcryptPasswordHasherService,
  PASSWORD_HASHER,
} from "./security/password-hasher";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AppLogger,
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasherService,
    },
  ],
  exports: [AppLogger, PrismaModule, PASSWORD_HASHER],
})
export class CoreModule {}
