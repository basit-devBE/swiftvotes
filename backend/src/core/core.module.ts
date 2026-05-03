import { Global, Module } from "@nestjs/common";

import { LoggerModule } from "./logging/logger.module";
import { PrismaModule } from "./prisma/prisma.module";
import {
  BcryptPasswordHasherService,
  PASSWORD_HASHER,
} from "./security/password-hasher";

@Global()
@Module({
  imports: [LoggerModule, PrismaModule],
  providers: [
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasherService,
    },
  ],
  exports: [LoggerModule, PrismaModule, PASSWORD_HASHER],
})
export class CoreModule {}
