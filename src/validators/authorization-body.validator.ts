import { IsBoolean, IsDefined, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Authorize } from "./authorize.validator";

export class AuthorizationBody {
  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  public appName: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  public authName: string;

  @ApiProperty()
  @IsBoolean()
  @IsDefined()
  @IsNotEmpty()
  public status: boolean;

  @ApiProperty()
  @IsDefined()
  authorize: Authorize;
}

export default AuthorizationBody;
