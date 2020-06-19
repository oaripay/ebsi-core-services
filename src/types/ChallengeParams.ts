import { IsString, IsDefined } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export default class ChallengeParams {
  @IsString()
  @IsDefined()
  @ApiProperty()
  did: string;

  @IsString()
  @IsDefined()
  @ApiProperty({ enum: ["universities", "governments"] })
  type: string;
}
