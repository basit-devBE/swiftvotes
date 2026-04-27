import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { storageConfig } from "../../core/config/storage.config";
import { CreateUploadIntentUseCase } from "./application/use-cases/create-upload-intent.use-case";
import { UPLOADS_SERVICE } from "./application/uploads.tokens";
import { S3UploadsService } from "./infrastructure/storage/s3-uploads.service";
import { UploadsController } from "./presentation/http/uploads.controller";

@Module({
  imports: [ConfigModule.forFeature(storageConfig)],
  controllers: [UploadsController],
  providers: [
    CreateUploadIntentUseCase,
    {
      provide: UPLOADS_SERVICE,
      useClass: S3UploadsService,
    },
  ],
})
export class UploadsModule {}
