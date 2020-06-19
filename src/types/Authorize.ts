import { IsString, IsDefined } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export default class Authorize {
  @IsString()
  @IsDefined()
  @ApiProperty()
  cryptedMessage: string;

  @IsString()
  @IsDefined()
  @ApiProperty()
  signature: string;
}
