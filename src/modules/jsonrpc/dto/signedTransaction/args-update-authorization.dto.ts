import { IsInt, IsHexadecimal, Min, Max } from "class-validator";

export class ArgsUpdateAuthorization {
  @IsHexadecimal()
  authorizationId: string;

  @IsInt()
  @Min(0)
  @Max(2)
  status: number;

  @IsInt()
  @Min(0)
  @Max(15)
  permissions: number;

  @IsInt()
  notAfter: number;
}

export default { ArgsUpdateAuthorization };
