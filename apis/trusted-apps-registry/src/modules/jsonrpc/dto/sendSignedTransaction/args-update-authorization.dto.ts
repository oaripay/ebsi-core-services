import { IsInt, IsHexadecimal, Min, Max, Matches } from "class-validator";

export class ArgsUpdateAuthorization {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  authorizationId!: string;

  @IsInt()
  @Min(0)
  @Max(3)
  status!: number;

  @IsInt()
  @Min(0)
  @Max(15)
  permissions!: number;

  @IsInt()
  @Min(0)
  notAfter!: number;
}

export default { ArgsUpdateAuthorization };
