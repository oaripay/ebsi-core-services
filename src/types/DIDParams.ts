import { IsString, IsDefined } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export default class DIDParams {
  @IsString()
  @IsDefined()
  @ApiProperty()
  did: string;
}
