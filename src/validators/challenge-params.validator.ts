import { IsDefined, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChallengeParams {
  @IsString()
  @IsDefined()
  @ApiProperty()
  name: string;
}

export default ChallengeParams;
