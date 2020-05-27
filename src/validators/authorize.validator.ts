import { IsDefined, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class Authorize {
  @IsString()
  @IsDefined()
  @ApiProperty()
  cryptedMessage: string;

  @IsString()
  @IsDefined()
  @ApiProperty()
  signature: string;
}

export default Authorize;
