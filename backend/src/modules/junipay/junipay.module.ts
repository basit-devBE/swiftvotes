import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { junipayConfig } from "../../core/config/junipay.config";
import { JunipayService } from "./infrastructure/junipay.service";

@Module({
  imports: [ConfigModule.forFeature(junipayConfig)],
  providers: [JunipayService],
  exports: [JunipayService],
})
export class JunipayModule {}
