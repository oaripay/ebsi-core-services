import { IsString, IsDefined, IsUrl } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export default class Accreditation {
  @ApiProperty()
  @IsString()
  @IsDefined()
  targetFramework: string;

  @ApiProperty()
  @IsUrl()
  @IsDefined()
  targetResource: string;
}
