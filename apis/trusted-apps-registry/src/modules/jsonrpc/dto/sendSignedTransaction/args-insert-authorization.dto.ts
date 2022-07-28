import { IsString, IsInt, Min, Max } from "class-validator";
import { IsDid } from "../../../../shared/validators";

export class ArgsInsertAuthorization {
  @IsString()
  name: string;

  @IsString()
  authorizedAppName: string;

  @IsDid()
  iss: string;

  @IsInt()
  @Min(0)
  @Max(3)
  status: number;

  @IsInt()
  @Min(0)
  @Max(15)
  permissions: number;

  @IsInt()
  @Min(0)
  notBefore: number;

  @IsInt()
  @Min(0)
  notAfter: number;
}

export default { ArgsInsertAuthorization };
