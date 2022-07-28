import { IsHexadecimal, IsInt, Min, Max } from "class-validator";

export class ArgsUpdateApp {
  @IsHexadecimal()
  applicationId: string;

  @IsInt()
  @Min(0)
  @Max(2)
  domain: number;
}

export default { ArgsUpdateApp };
