import { IsString, IsDefined } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import Authorize from "./Authorize";

export default class GovernmentBody {
  @ApiProperty()
  @IsString()
  @IsDefined()
  issuerDID: string;

  @ApiProperty()
  @IsDefined()
  authorize: Authorize;

  @ApiProperty()
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  country: string;
}
