import { IsString, MaxLength } from "class-validator";

export class RedeemIssuedTicketDto {
  @IsString()
  @MaxLength(64)
  code!: string;
}
