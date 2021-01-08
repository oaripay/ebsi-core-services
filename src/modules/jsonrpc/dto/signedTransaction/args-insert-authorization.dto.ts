import { IsString, IsInt, Min, Max } from "class-validator";
import { IsDid } from "../../validators";

export class ArgsInsertAuthorization {
  @IsString()
  name: string;

  @IsString()
  authorizedAppName: string;

  @IsDid()
  iss: string;

  @IsInt()
  @Min(0)
  @Max(2)
  status: number;

  @IsInt()
  @Min(0)
  @Max(15)
  operations: number;

  @IsInt()
  notBefore: number;

  @IsInt()
  notAfter: number;
}

export default { ArgsInsertAuthorization };
