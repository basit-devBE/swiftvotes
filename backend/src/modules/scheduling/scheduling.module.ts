import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { EventsModule } from "../events/events.module";
import { LifecycleSchedulerService } from "./lifecycle-scheduler.service";

@Module({
  imports: [ScheduleModule.forRoot(), EventsModule],
  providers: [LifecycleSchedulerService],
})
export class SchedulingModule {}
