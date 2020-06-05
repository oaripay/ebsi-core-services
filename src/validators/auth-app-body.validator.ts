import { IsDefined, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Authorize } from "./authorize.validator";

export class AuthAppBody {
  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  public name: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  public pubKey: string;

  @ApiProperty()
  @IsDefined()
  authorize: Authorize;
}

export default AuthAppBody;
