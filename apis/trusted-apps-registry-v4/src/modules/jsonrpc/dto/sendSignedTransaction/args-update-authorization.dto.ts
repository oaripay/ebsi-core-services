import { IsInt, IsHexadecimal, Min, Max } from "class-validator";

export class ArgsUpdateAuthorization {
  @IsHexadecimal()
  authorizationId!: string;

  @IsInt()
  @Min(0)
  @Max(3)
  status!: number;
}

export default { ArgsUpdateAuthorization };
