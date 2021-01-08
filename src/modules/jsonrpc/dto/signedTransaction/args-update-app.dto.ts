import { IsHexadecimal, IsInt, IsString, Min, Max } from "class-validator";

export class ArgsUpdateApp {
  @IsHexadecimal()
  applicationId: string;

  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  @Max(1)
  domain: number;
}

export default { ArgsUpdateApp };
