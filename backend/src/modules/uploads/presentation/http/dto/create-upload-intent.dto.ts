import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateUploadIntentDto {
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(120)
  contentType!: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  nominationId?: string;
}
