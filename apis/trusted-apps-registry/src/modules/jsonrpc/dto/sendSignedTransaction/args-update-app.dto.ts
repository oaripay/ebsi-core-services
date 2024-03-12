import { IsHexadecimal, IsInt, Min, Max, Matches } from "class-validator";

export class ArgsUpdateApp {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  applicationId!: string;

  @IsInt()
  @Min(0)
  @Max(2)
  domain!: number;
}

export default { ArgsUpdateApp };
