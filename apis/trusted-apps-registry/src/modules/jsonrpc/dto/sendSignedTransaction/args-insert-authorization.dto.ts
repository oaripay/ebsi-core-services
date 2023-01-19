import { IsString, IsInt, Min, Max } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsInsertAuthorization {
  @IsString()
  name: string;

  @IsString()
  authorizedAppName: string;

  @IsDidV1()
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
