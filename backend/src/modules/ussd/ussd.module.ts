import { Module } from "@nestjs/common";

import { JunipayModule } from "../junipay/junipay.module";
import { VotesModule } from "../votes/votes.module";
import { UssdHooksService } from "./application/ussd-hooks.service";
import { UssdHooksController } from "./presentation/http/ussd-hooks.controller";

@Module({
  imports: [VotesModule, JunipayModule],
  controllers: [UssdHooksController],
  providers: [UssdHooksService],
})
export class UssdModule {}
