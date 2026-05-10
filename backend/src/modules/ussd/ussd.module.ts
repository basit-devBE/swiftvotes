import { Module } from "@nestjs/common";

import { VotesModule } from "../votes/votes.module";
import { UssdHooksService } from "./application/ussd-hooks.service";
import { UssdHooksController } from "./presentation/http/ussd-hooks.controller";

@Module({
  imports: [VotesModule],
  controllers: [UssdHooksController],
  providers: [UssdHooksService],
})
export class UssdModule {}
