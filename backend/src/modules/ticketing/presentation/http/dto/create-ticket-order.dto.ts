import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CreateTicketOrderItemDto {
  @IsString()
  ticketTypeId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateTicketOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTicketOrderItemDto)
  items!: CreateTicketOrderItemDto[];

  @IsString()
  @MaxLength(180)
  buyerName!: string;

  @IsEmail()
  @MaxLength(254)
  buyerEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  buyerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  callbackOrigin?: string;
}
