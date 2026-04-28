import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { AppLogger } from "../../core/logging/app-logger.service";
import { SynchronizeEventLifecycleUseCase } from "../events/application/use-cases/synchronize-event-lifecycle.use-case";

@Injectable()
export class LifecycleSchedulerService {
  constructor(
    private readonly synchronizeEventLifecycleUseCase: SynchronizeEventLifecycleUseCase,
    private readonly logger: AppLogger,
  ) {}

  @Cron("0 * * * * *")
  async synchronizeLifecycle(): Promise<void> {
    const updated = await this.synchronizeEventLifecycleUseCase.execute();

    if (updated > 0) {
      this.logger.log(
        `Synchronized ${updated} event lifecycle transition(s).`,
        "LifecycleScheduler",
      );
    }
  }
}
